import React, { useCallback, useEffect, useRef, useState } from "react";
import { App, Button, Card, Collapse, Flex, Progress, Space, Table, Tag, Tooltip, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { CheckCircleOutlined, CloseCircleOutlined, DeleteOutlined, FolderOpenOutlined, LoadingOutlined, ReloadOutlined, SwapOutlined, UploadOutlined, WarningOutlined } from "@ant-design/icons";
import { nanoid } from "nanoid";
import { useBlocker } from "react-router-dom";

import DashboardContent from "../components/dashboards/DashboardContent";
import ImportBatchSummary from "../components/ImportBatchSummary";
import type { ImportVideo, ImportVideoStatus } from "../importTypes";
import { pocketBaseVideoUploadAdapter } from "../importUploadAdapters";
import { hashFileSample } from "../lib/fileHashing";
import { isValidVideoForImport } from "../lib/importVideoValidation";
import { optimiseMp4ForWeb } from "../lib/optimiseMp4ForWeb";
import { createVideoThumbnail } from "../lib/videoThumbnail";
import { readDroppedFiles, type FileWithRelativePath } from "../lib/readDroppedFiles";
import useIsMounted from "../hooks/useIsMounted";
import { useVideoStore } from "../DataStores";
import type { Video } from "../types";

const { Text, Title } = Typography;

// Which local video to keep, per file hash, when the user overrides the default first-one-wins.
type PreferredDuplicateKeepers = Record<string, string>;

const statusColors: Record<ImportVideoStatus, string> = {
  pending: "default",
  ready: "blue",
  uploading: "processing",
  uploaded: "success",
  failed: "error",
  cancelled: "warning",
};

const isMp4File = (file: File) => file.name.toLowerCase().endsWith(".mp4");

const createImportVideo = (file: FileWithRelativePath): ImportVideo => {
  return {
    localId: nanoid(),
    file,
    filename: file.name,
    fileSize: file.size,
    relativePath: file.webkitRelativePath || undefined,
    status: "pending",
    isLoading: true,
    loadingMessage: "checking video",
    progressPercent: 0,
  };
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
};

const getDuplicateVideo = (
  video: ImportVideo,
  videos: ImportVideo[],
  preferredDuplicateKeepers: PreferredDuplicateKeepers,
) => {
  if (!video.fileHash) return undefined;

  // Once a video is uploading or uploaded it's locked in as the keeper for its hash -
  // a swap made after that point must not hide it or promote a still-unstarted copy.
  if (video.status === "uploading" || video.status === "uploaded") return undefined;

  const committedVideo = videos.find((candidate) => (
    candidate.localId !== video.localId
    && candidate.fileHash === video.fileHash
    && (candidate.status === "uploading" || candidate.status === "uploaded")
  ));
  if (committedVideo) return committedVideo;

  const preferredKeeperId = preferredDuplicateKeepers[video.fileHash];
  if (preferredKeeperId) {
    if (preferredKeeperId === video.localId) return undefined;

    const keeper = videos.find((candidate) => candidate.localId === preferredKeeperId);
    if (keeper && keeper.isValid !== false) return keeper;
    // The chosen keeper was removed from the list - fall back to the default below.
  }

  const videoIndex = videos.findIndex((candidate) => candidate.localId === video.localId);
  if (videoIndex === -1) return undefined;

  return videos.slice(0, videoIndex).find((candidate) => (
    candidate.fileHash === video.fileHash && candidate.isValid !== false
  ));
};

const getUploadedDuplicateVideo = (video: ImportVideo, uploadedVideos: Video[]) => {
  if (!video.fileHash) return undefined;

  // Otherwise a just-uploaded row would match its own new record and flag itself.
  if (video.status === "uploading" || video.status === "uploaded") return undefined;

  return uploadedVideos.find((uploadedVideo) => uploadedVideo.file_hash === video.fileHash);
};

// Only counts toward "Videos to upload" once fully checked - a video sits in
// the active group before that too, but could still turn out invalid or a duplicate.
const hasFinishedProcessing = (video: ImportVideo) => (
  video.isValid === true && !video.needsWebOptimisation && Boolean(video.fileHash)
  && !video.isLoading && video.status !== "pending"
);

const isSelectedUploadCandidate = (
  video: ImportVideo,
  videos: ImportVideo[],
  uploadedVideos: Video[],
  preferredDuplicateKeepers: PreferredDuplicateKeepers,
) => (
  video.isValid
  && !video.needsWebOptimisation
  && Boolean(video.fileHash)
  && !getDuplicateVideo(video, videos, preferredDuplicateKeepers)
  && !getUploadedDuplicateVideo(video, uploadedVideos)
  && (video.status === "ready" || video.status === "failed" || video.status === "cancelled")
);

const canUploadVideo = (
  video: ImportVideo,
  videos: ImportVideo[],
  uploadedVideos: Video[],
  preferredDuplicateKeepers: PreferredDuplicateKeepers,
) => (
  isSelectedUploadCandidate(video, videos, uploadedVideos, preferredDuplicateKeepers)
  && Boolean(video.thumbnailFile)
);

// A cancelled video already passed validation to start uploading, so it
// retries the same way a genuine upload failure does.
const isRetryableFailure = (
  video: ImportVideo,
  videos: ImportVideo[],
  uploadedVideos: Video[],
  preferredDuplicateKeepers: PreferredDuplicateKeepers,
) => (
  (video.status === "failed" || video.status === "cancelled")
  && canUploadVideo(video, videos, uploadedVideos, preferredDuplicateKeepers)
);

// Invalid/duplicate videos are dead ends - they shouldn't hold the leave-page guard open.
const hasUnfinishedWork = (
  video: ImportVideo,
  videos: ImportVideo[],
  uploadedVideos: Video[],
  preferredDuplicateKeepers: PreferredDuplicateKeepers,
) => (
  video.status === "pending"
  || video.status === "uploading"
  || video.isLoading
  || isSelectedUploadCandidate(video, videos, uploadedVideos, preferredDuplicateKeepers)
);

// "Already uploaded" and "invalid" share the "wontUpload" bucket - neither is
// actionable, unlike a duplicate the user can swap. The row's tag still shows which applies.
type VideoGroup = "active" | "duplicate" | "wontUpload";

const getVideoGroup = (
  video: ImportVideo,
  videos: ImportVideo[],
  uploadedVideos: Video[],
  preferredDuplicateKeepers: PreferredDuplicateKeepers,
): VideoGroup => {
  if (getUploadedDuplicateVideo(video, uploadedVideos)) return "wontUpload";
  if (getDuplicateVideo(video, videos, preferredDuplicateKeepers)) return "duplicate";
  if (video.isValid === false) return "wontUpload";
  return "active";
};

const getValidationTag = (video: ImportVideo) => {
  if (video.isLoading || video.isValid === undefined) {
    return <Tag icon={<LoadingOutlined spin />} color="processing">{video.loadingMessage ?? "checking video"}</Tag>;
  }

  if (video.isValid === false) {
    return (
      <Tooltip title={video.validationMessage}>
        <Tag icon={<CloseCircleOutlined />} color="error">invalid</Tag>
      </Tooltip>
    );
  }

  if (video.needsWebOptimisation) {
    return (
      <Tooltip title={video.validationMessage}>
        <Tag icon={<WarningOutlined />} color="warning">needs web optimisation</Tag>
      </Tooltip>
    );
  }

  if (video.wasWebOptimised) {
    return (
      <Tooltip title="This video has been optimised for web playback.">
        <Tag icon={<CheckCircleOutlined />} color="success">valid</Tag>
      </Tooltip>
    );
  }

  return (
    <Tooltip title="This video is compatible with AnimalMatch.">
      <Tag icon={<CheckCircleOutlined />} color="success">valid</Tag>
    </Tooltip>
  );
};

const getDuplicateTag = (duplicateVideo: ImportVideo) => (
  <Tooltip title={`Matches ${duplicateVideo.filename} and will be skipped on upload.`}>
    <Tag icon={<WarningOutlined />} color="warning">duplicate video</Tag>
  </Tooltip>
);

const getUploadedDuplicateTag = (duplicateVideo: Video) => (
  <Tooltip title={`Already uploaded as ${duplicateVideo.filename} and will be skipped on upload.`}>
    <Tag icon={<WarningOutlined />} color="warning">already uploaded</Tag>
  </Tooltip>
);

const getStatusContent = (
  video: ImportVideo,
  videos: ImportVideo[],
  uploadedVideos: Video[],
  preferredDuplicateKeepers: PreferredDuplicateKeepers,
) => {
  if (video.isLoading || video.isValid === undefined) {
    return getValidationTag(video);
  }

  // Checked before local duplicates: every copy of an already-uploaded file is equally
  // "already uploaded", not just the one copy nothing else in the batch happens to precede.
  const uploadedDuplicateVideo = getUploadedDuplicateVideo(video, uploadedVideos);
  if (uploadedDuplicateVideo) return getUploadedDuplicateTag(uploadedDuplicateVideo);

  const duplicateVideo = getDuplicateVideo(video, videos, preferredDuplicateKeepers);
  if (duplicateVideo) return getDuplicateTag(duplicateVideo);

  if (video.isValid !== false && !video.needsWebOptimisation && !video.fileHash) {
    return <Tag icon={<LoadingOutlined spin />} color="processing">checking duplicates</Tag>;
  }

  return getValidationTag(video);
};

const getProgressContent = (
  video: ImportVideo,
  videos: ImportVideo[],
  uploadedVideos: Video[],
  hasUploadStarted: boolean,
  preferredDuplicateKeepers: PreferredDuplicateKeepers,
) => {
  const duplicateVideo = getDuplicateVideo(video, videos, preferredDuplicateKeepers);
  const uploadedDuplicateVideo = getUploadedDuplicateVideo(video, uploadedVideos);

  if (!hasUploadStarted && (video.isValid === false || video.needsWebOptimisation || duplicateVideo || uploadedDuplicateVideo)) {
    return <Text type="secondary">-</Text>;
  }

  if (video.isValid === false) {
    return <Tag color="error">skipped</Tag>;
  }

  if (video.needsWebOptimisation) {
    return <Tag color="warning">skipped</Tag>;
  }

  if (duplicateVideo || uploadedDuplicateVideo) {
    return <Tag color="warning">skipped</Tag>;
  }

  return <Progress percent={video.progressPercent} size="small" />;
};

const shouldShowUploadStatus = (video: ImportVideo) => (
  video.status === "uploading"
  || video.status === "uploaded"
  || video.status === "cancelled"
  || (video.status === "failed" && video.isValid)
);

const ImportsPage: React.FC = () => {
  const { message, modal } = App.useApp();
  const [videos, setVideos] = useState<ImportVideo[]>([]);
  const [hasUploadStarted, setHasUploadStarted] = useState(false);
  const [isAutoUploadEnabled, setIsAutoUploadEnabled] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [thumbnailUrls, setThumbnailUrls] = useState<Record<string, string>>({});
  const [preferredDuplicateKeepers, setPreferredDuplicateKeepers] = useState<PreferredDuplicateKeepers>({});
  const [activeGroupKeys, setActiveGroupKeys] = useState<VideoGroup[]>([]);
  const manuallyToggledGroupKeysRef = useRef<Set<VideoGroup>>(new Set());
  const thumbnailUrlsRef = useRef<Record<string, string>>({});
  const uploadedVideos = useVideoStore((state) => state.processedRecords);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const uploadAbortControllerRef = useRef<AbortController | null>(null);
  const thumbnailPreparationIdsRef = useRef<Set<string>>(new Set());
  const isPreparationActive = useIsMounted();

  // The source of truth for videos - updateVideo/addFiles/removeVideo write to
  // it synchronously and setVideos just mirrors it for rendering, rather than
  // the ref being a render-time copy of state. React only calls a setVideos
  // updater once it gets around to processing the update, so anything that
  // needs to read "the latest videos" from async pipeline code (prepareVideo,
  // the auto-upload effect) right after a change would otherwise see stale data.
  const videosRef = useRef<ImportVideo[]>(videos);
  const uploadedVideosRef = useRef<Video[]>(uploadedVideos);
  uploadedVideosRef.current = uploadedVideos;
  const preferredDuplicateKeepersRef = useRef<PreferredDuplicateKeepers>(preferredDuplicateKeepers);
  preferredDuplicateKeepersRef.current = preferredDuplicateKeepers;

  const hasUnfinishedImportWork = videos.some((video) => (
    hasUnfinishedWork(video, videos, uploadedVideos, preferredDuplicateKeepers)
  ));

  useEffect(() => {
    folderInputRef.current?.setAttribute("webkitdirectory", "");
    folderInputRef.current?.setAttribute("directory", "");
  }, []);

  // Covers refresh/close/typing a new URL; in-app nav (header links, back/forward)
  // doesn't trigger beforeunload, so useBlocker below handles that case instead.
  useEffect(() => {
    if (!hasUnfinishedImportWork) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnfinishedImportWork]);

  const navigationBlocker = useBlocker(hasUnfinishedImportWork);

  const cancelUpload = useCallback(() => {
    setIsAutoUploadEnabled(false);
    uploadAbortControllerRef.current?.abort();
  }, []);

  useEffect(() => {
    if (navigationBlocker.state !== "blocked") return;

    const hasActiveUploadQueue = uploadAbortControllerRef.current !== null;
    const leaveConfirmation = modal.confirm({
      title: "Leave this import?",
      content: hasActiveUploadQueue
        ? "The active upload queue will continue. Videos not yet queued and this page's progress and controls will be lost. Your original files are unaffected."
        : "This import session and its progress will be lost. Your original files are unaffected.",
      okText: hasActiveUploadQueue ? "Leave & keep uploading" : "Leave",
      okButtonProps: hasActiveUploadQueue ? undefined : { danger: true },
      cancelText: "Stay",
      onOk: () => navigationBlocker.proceed(),
      onCancel: () => navigationBlocker.reset(),
      footer: hasActiveUploadQueue ? (_originNode, { OkBtn, CancelBtn }) => (
        <Space>
          <CancelBtn />
          <Button
            danger
            onClick={() => {
              cancelUpload();
              leaveConfirmation.destroy();
              navigationBlocker.proceed();
            }}
          >
            Cancel uploads & leave
          </Button>
          <OkBtn />
        </Space>
      ) : undefined,
    });
  }, [cancelUpload, navigationBlocker, modal]);

  // Revoked once a video is removed (or the page unmounts) to avoid leaking one per thumbnail.
  useEffect(() => {
    setThumbnailUrls((currentUrls) => {
      const nextUrls = { ...currentUrls };
      const currentIds = new Set(videos.map((video) => video.localId));
      let didChange = false;

      for (const video of videos) {
        if (video.thumbnailFile && !nextUrls[video.localId]) {
          nextUrls[video.localId] = URL.createObjectURL(video.thumbnailFile);
          didChange = true;
        }
      }

      for (const localId of Object.keys(nextUrls)) {
        if (!currentIds.has(localId)) {
          URL.revokeObjectURL(nextUrls[localId]);
          delete nextUrls[localId];
          didChange = true;
        }
      }

      const result = didChange ? nextUrls : currentUrls;
      thumbnailUrlsRef.current = result;
      return result;
    });
  }, [videos]);

  useEffect(() => () => {
    Object.values(thumbnailUrlsRef.current).forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const updateVideo = useCallback((localId: string, changes: Partial<ImportVideo>) => {
    // Computed from videosRef rather than via setVideos' own updater callback,
    // which React only invokes once it gets around to processing the update -
    // videosRef.current needs to be correct immediately, since async pipeline
    // code (the auto-upload effect, prepareVideo) reads it right after calling
    // this and can't wait for a render that may not have happened yet.
    const nextVideos = videosRef.current.map((video) => (
      video.localId === localId ? { ...video, ...changes } : video
    ));
    videosRef.current = nextVideos;
    setVideos(nextVideos);
  }, []);

  const failVideo = useCallback((localId: string, validationMessage: string) => {
    updateVideo(localId, {
      status: "failed",
      isLoading: false,
      loadingMessage: undefined,
      isValid: false,
      needsWebOptimisation: false,
      wasWebOptimised: false,
      validationMessage,
    });
  }, [updateVideo]);

  const validateVideo = async (video: ImportVideo) => {
    try {
      updateVideo(video.localId, {
        isLoading: true,
        loadingMessage: "checking video",
      });

      const result = await isValidVideoForImport(video.file);
      if (!isPreparationActive()) return undefined;

      updateVideo(video.localId, {
        // Not "ready" yet even when no web optimisation is needed - hashing and
        // thumbnailing still have to happen first; prepareVideo sets "ready" once
        // the whole pipeline is actually done, so canUploadVideo can't fire early.
        status: result.isValid ? "pending" : "failed",
        isLoading: result.needsWebOptimisation,
        loadingMessage: result.needsWebOptimisation ? "optimising for web" : undefined,
        isValid: result.isValid,
        needsWebOptimisation: result.needsWebOptimisation,
        wasWebOptimised: false,
        thumbnailFile: undefined,
        validationMessage: result.message,
      });

      return result;
    } catch {
      if (!isPreparationActive()) return undefined;
      failVideo(video.localId, "Video validation failed.");
      return undefined;
    }
  };

  const hashVideoSource = async (video: ImportVideo, file = video.file) => {
    try {
      updateVideo(video.localId, {
        isLoading: true,
        loadingMessage: "checking duplicates",
      });

      const result = await hashFileSample(file);
      if (!isPreparationActive()) return undefined;

      updateVideo(video.localId, { fileHash: result.hash });

      return result.hash;
    } catch {
      if (!isPreparationActive()) return undefined;
      failVideo(video.localId, "Could not hash video source.");
      return undefined;
    }
  };

  const optimiseVideoForWeb = async (video: ImportVideo) => {
    try {
      updateVideo(video.localId, {
        isLoading: true,
        loadingMessage: "optimising for web",
      });

      const result = await optimiseMp4ForWeb(video.file);
      if (!isPreparationActive()) return undefined;

      const validationResult = await isValidVideoForImport(result.file);
      if (!isPreparationActive()) return undefined;

      if (!validationResult.isValid || validationResult.needsWebOptimisation) {
        failVideo(video.localId, "Video web optimisation failed.");
        return undefined;
      }

      updateVideo(video.localId, {
        file: result.file,
        fileSize: result.file.size,
        // Still "pending", not "ready" - same reasoning as validateVideo above.
        isLoading: false,
        loadingMessage: undefined,
        isValid: true,
        needsWebOptimisation: false,
        wasWebOptimised: true,
        validationMessage: undefined,
      });

      return result.file;
    } catch {
      if (!isPreparationActive()) return undefined;
      failVideo(video.localId, "Video web optimisation failed.");
      return undefined;
    }
  };

  const createThumbnailForVideo = useCallback(async (video: ImportVideo, file: File) => {
    try {
      updateVideo(video.localId, {
        isLoading: true,
        loadingMessage: "creating thumbnail",
      });

      const thumbnailFile = await createVideoThumbnail(file);
      if (!isPreparationActive()) return false;

      updateVideo(video.localId, { thumbnailFile });

      return true;
    } catch {
      if (!isPreparationActive()) return false;
      failVideo(video.localId, "Could not create a thumbnail. The video may not be playable in this browser.");
      return false;
    }
  }, [failVideo, isPreparationActive, updateVideo]);

  const prepareVideo = async (video: ImportVideo) => {
    if (!isPreparationActive()) return;

    const validationResult = await validateVideo(video);
    if (!validationResult?.isValid) return;

    const fileToUpload = validationResult.needsWebOptimisation
      ? await optimiseVideoForWeb(video)
      : video.file;

    if (!fileToUpload || !isPreparationActive()) return;

    const fileHash = await hashVideoSource(video, fileToUpload);
    if (!fileHash || !isPreparationActive()) return;

    // Hash first, then only spend time on a thumbnail if this copy will actually be
    // uploaded - a duplicate or already-uploaded video is going to be skipped either way.
    const hashedVideo = { ...video, fileHash };
    const isDuplicate = Boolean(getDuplicateVideo(hashedVideo, videosRef.current, preferredDuplicateKeepersRef.current))
      || Boolean(getUploadedDuplicateVideo(hashedVideo, uploadedVideosRef.current));

    if (!isDuplicate) {
      const hasThumbnail = await createThumbnailForVideo(video, fileToUpload);
      if (!hasThumbnail) return;
    }

    if (!isPreparationActive()) return;

    updateVideo(video.localId, {
      status: "ready",
      isLoading: false,
      loadingMessage: undefined,
    });
  };

  const prepareVideos = async (videosToPrepare: ImportVideo[]) => {
    for (const video of videosToPrepare) {
      if (!isPreparationActive()) break;
      await prepareVideo(video);
    }
  };

  // Duplicates skip thumbnail work while they are inactive. If swapping/removing
  // a keeper promotes one later, prepare its thumbnail before making it uploadable.
  useEffect(() => {
    if (!isPreparationActive()) return;

    const videosNeedingThumbnails = videosRef.current.filter((video) => (
      !video.thumbnailFile
      && !video.isLoading
      && video.status === "ready"
      && !thumbnailPreparationIdsRef.current.has(video.localId)
      && isSelectedUploadCandidate(
        video,
        videosRef.current,
        uploadedVideosRef.current,
        preferredDuplicateKeepersRef.current,
      )
    ));

    for (const video of videosNeedingThumbnails) {
      thumbnailPreparationIdsRef.current.add(video.localId);

      void createThumbnailForVideo(video, video.file).then((hasThumbnail) => {
        if (hasThumbnail) {
          updateVideo(video.localId, {
            status: "ready",
            isLoading: false,
            loadingMessage: undefined,
          });
        }
      }).finally(() => {
        thumbnailPreparationIdsRef.current.delete(video.localId);
      });
    }
  }, [createThumbnailForVideo, isPreparationActive, updateVideo, videos, uploadedVideos, preferredDuplicateKeepers]);

  const addFiles = (files: FileList | FileWithRelativePath[] | null) => {
    if (!files) return;

    const allFiles = Array.from(files);
    const videosToAdd = allFiles
      .filter(isMp4File)
      .map((file) => createImportVideo(file as FileWithRelativePath));
    const skippedCount = allFiles.length - videosToAdd.length;

    if (skippedCount > 0) {
      message.warning(`Only .mp4 files are supported. Skipped ${skippedCount} file${skippedCount === 1 ? "" : "s"}.`);
    }

    if (videosToAdd.length === 0) return;

    videosRef.current = [...videosRef.current, ...videosToAdd];
    setVideos(videosRef.current);
    void prepareVideos(videosToAdd);
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(event.target.files);
    event.target.value = "";
  };

  const handleDropzoneDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setIsDraggingOver(true);
  };

  const handleDropzoneDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDraggingOver(false);
  };

  const handleDropzoneDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDraggingOver(false);

    void readDroppedFiles(event.dataTransfer.items).then(({ files, failedEntryCount }) => {
      addFiles(files);

      if (failedEntryCount > 0) {
        message.warning(
          `Could not read ${failedEntryCount} dropped item${failedEntryCount === 1 ? "" : "s"}. ${files.length > 0 ? "The remaining files were added." : "No files were added."}`,
        );
      }
    });
  };

  const removeVideo = (localId: string) => {
    videosRef.current = videosRef.current.filter((video) => video.localId !== localId);
    setVideos(videosRef.current);
  };

  const keepThisFileInstead = (video: ImportVideo) => {
    if (!video.fileHash) return;

    setPreferredDuplicateKeepers((current) => ({ ...current, [video.fileHash!]: video.localId }));
  };

  const uploadVideo = async (video: ImportVideo, signal: AbortSignal) => {
    updateVideo(video.localId, {
      status: "uploading",
      isLoading: false,
      loadingMessage: undefined,
      progressPercent: 0,
      errorMessage: undefined,
    });

    try {
      await pocketBaseVideoUploadAdapter.uploadVideo(video, (progressPercent) => {
        updateVideo(video.localId, { progressPercent });
      }, signal);

      updateVideo(video.localId, { status: "uploaded", progressPercent: 100 });
    } catch (error) {
      if (signal.aborted) {
        updateVideo(video.localId, { status: "cancelled" });
        return;
      }

      updateVideo(video.localId, {
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Upload failed",
      });
    }
  };

  const runUploads = async (videosToUpload: ImportVideo[]) => {
    setHasUploadStarted(true);

    const controller = new AbortController();
    uploadAbortControllerRef.current = controller;

    try {
      for (const video of videosToUpload) {
        if (controller.signal.aborted) break;
        await uploadVideo(video, controller.signal);
      }
    } finally {
      if (uploadAbortControllerRef.current === controller) {
        uploadAbortControllerRef.current = null;
      }
    }
  };

  const uploadReadyVideos = () => {
    setIsAutoUploadEnabled(true);
    return runUploads(videos.filter((video) => canUploadVideo(video, videos, uploadedVideos, preferredDuplicateKeepers)));
  };

  const retryVideo = (video: ImportVideo) => runUploads([video]);

  const retryFailedVideos = () => (
    runUploads(videos.filter((video) => isRetryableFailure(video, videos, uploadedVideos, preferredDuplicateKeepers)))
  );

  const uploadableVideoCount = videos.filter((video) => (
    canUploadVideo(video, videos, uploadedVideos, preferredDuplicateKeepers)
  )).length;
  const isUploading = videos.some((video) => video.status === "uploading");

  // Once Upload has been pressed, keep picking up videos that finish checking
  // afterward instead of requiring another click - runUploads only ever sees
  // a fixed snapshot, so this effect is what re-dispatches it as more videos
  // become ready. Each video is claimed permanently the moment it's picked up,
  // rather than un-claimed once its upload settles: releasing the claim on
  // completion would race against videosRef only being refreshed at render
  // time (a video's "uploaded" state can be set after runUploads' promise has
  // already resolved), letting this effect see a stale "ready" snapshot and
  // dispatch the same video twice. A video never needs auto-picking-up a
  // second time anyway - if it fails, retrying is a deliberate user action.
  const isDispatchingAutoUploadRef = useRef(false);
  const autoUploadedVideoIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!isAutoUploadEnabled || isUploading || uploadAbortControllerRef.current || isDispatchingAutoUploadRef.current) return;

    const readyVideos = videosRef.current.filter((video) => (
      video.status === "ready"
      && !autoUploadedVideoIdsRef.current.has(video.localId)
      && canUploadVideo(video, videosRef.current, uploadedVideosRef.current, preferredDuplicateKeepersRef.current)
    ));
    if (readyVideos.length === 0) return;

    readyVideos.forEach((video) => autoUploadedVideoIdsRef.current.add(video.localId));
    isDispatchingAutoUploadRef.current = true;
    void runUploads(readyVideos).finally(() => {
      isDispatchingAutoUploadRef.current = false;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAutoUploadEnabled, isUploading, videos, uploadedVideos, preferredDuplicateKeepers]);
  const totalSize = videos.reduce((sum, video) => sum + video.fileSize, 0);

  const checkingCount = videos.filter((video) => video.isLoading || video.isValid === undefined).length;
  const uploadingCount = videos.filter((video) => video.status === "uploading").length;
  const uploadedCount = videos.filter((video) => video.status === "uploaded").length;
  const failedCount = videos.filter((video) => (
    isRetryableFailure(video, videos, uploadedVideos, preferredDuplicateKeepers)
  )).length;
  const readyCount = videos.filter((video) => (
    video.status === "ready" && canUploadVideo(video, videos, uploadedVideos, preferredDuplicateKeepers)
  )).length;
  const skippedCount = videos.length - checkingCount - uploadingCount - uploadedCount - failedCount - readyCount;

  // Weight overall progress by bytes so one large video doesn't count the
  // same as a small one.
  const batchVideos = videos.filter((video) => (
    canUploadVideo(video, videos, uploadedVideos, preferredDuplicateKeepers)
    || video.status === "uploading"
    || video.status === "uploaded"
    || (video.status === "failed" && video.isValid)
  ));
  const batchTotalBytes = batchVideos.reduce((sum, video) => sum + video.fileSize, 0);
  const uploadedBytes = batchVideos
    .filter((video) => video.status === "uploaded")
    .reduce((sum, video) => sum + video.fileSize, 0);
  const uploadingBytes = batchVideos
    .filter((video) => video.status === "uploading")
    .reduce((sum, video) => sum + (video.fileSize * video.progressPercent) / 100, 0);

  const toBatchPercent = (bytes: number) => (batchTotalBytes === 0 ? 0 : Math.round((bytes / batchTotalBytes) * 100));
  const uploadedPercent = toBatchPercent(uploadedBytes);
  const overallPercent = toBatchPercent(uploadedBytes + uploadingBytes);

  const columns: ColumnsType<ImportVideo> = [
    {
      title: "Video",
      dataIndex: "filename",
      render: (_, video) => (
        <Flex align="center" justify="space-between" gap="small">
          <Flex align="center" gap="small">
            <div
              style={{
                width: 64,
                height: 36,
                borderRadius: 4,
                overflow: "hidden",
                background: "#f0f0f0",
                flexShrink: 0,
              }}
            >
              {thumbnailUrls[video.localId] && (
                <img
                  src={thumbnailUrls[video.localId]}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
              )}
            </div>
            <Space direction="vertical" size={0}>
              <Text strong>{video.filename}</Text>
              {video.relativePath && <Text type="secondary">{video.relativePath}</Text>}
            </Space>
          </Flex>
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            aria-label={`Remove ${video.filename} from the import list`}
            onClick={() => removeVideo(video.localId)}
            disabled={isUploading}
          />
        </Flex>
      ),
    },
    {
      title: "Size",
      dataIndex: "fileSize",
      render: (fileSize: number) => formatFileSize(fileSize),
      width: 120,
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (status: ImportVideoStatus, video) => {
        const canRetry = !isUploading && isRetryableFailure(video, videos, uploadedVideos, preferredDuplicateKeepers);
        const duplicateVideo = getDuplicateVideo(video, videos, preferredDuplicateKeepers);
        // If it's already on the server, every copy shares its hash - swapping the keeper
        // never makes any of them uploadable, so only offer it between two local duplicates.
        const canSwapToThisFile = duplicateVideo && !getUploadedDuplicateVideo(video, uploadedVideos);

        return (
          <Space direction="vertical" size={0}>
            <Space size={4}>
              {shouldShowUploadStatus(video)
                ? <Tag color={statusColors[status]}>{status}</Tag>
                : getStatusContent(video, videos, uploadedVideos, preferredDuplicateKeepers)}
              {canRetry && (
                <Tooltip title="Retry upload">
                  <Button
                    type="text"
                    size="small"
                    icon={<ReloadOutlined />}
                    aria-label={`Retry upload for ${video.filename}`}
                    onClick={() => void retryVideo(video)}
                  />
                </Tooltip>
              )}
            </Space>
            {canSwapToThisFile && (
              <Button
                type="link"
                size="small"
                icon={<SwapOutlined />}
                style={{ padding: 0, height: "auto" }}
                onClick={() => keepThisFileInstead(video)}
              >
                Use this file instead
              </Button>
            )}
            {video.errorMessage && (
              <Text type="danger">{video.errorMessage}</Text>
            )}
          </Space>
        );
      },
      width: 220,
    },
    {
      title: "Progress",
      dataIndex: "progressPercent",
      render: (_, video) => (
        getProgressContent(video, videos, uploadedVideos, hasUploadStarted, preferredDuplicateKeepers)
      ),
      width: 220,
    },
  ];

  const groupedVideos = videos.reduce<Record<VideoGroup, ImportVideo[]>>((groups, video) => {
    const group = getVideoGroup(video, videos, uploadedVideos, preferredDuplicateKeepers);
    groups[group].push(video);
    return groups;
  }, { active: [], duplicate: [], wontUpload: [] });

  const allGroupSections: { key: VideoGroup; label: string; videos: ImportVideo[] }[] = [
    { key: "active", label: "Videos to upload", videos: groupedVideos.active },
    { key: "duplicate", label: "Duplicate videos", videos: groupedVideos.duplicate },
    { key: "wontUpload", label: "Won't be uploaded", videos: groupedVideos.wontUpload },
  ];
  // Duplicate/wontUpload only gain members once fully resolved, so their counts are
  // already accurate - active is the one group a still-checking video defaults into.
  const confirmedActiveCount = groupedVideos.active.filter(hasFinishedProcessing).length;
  const pendingCount = videos.filter((video) => video.isValid !== false && !hasFinishedProcessing(video)).length;
  const groupSections = allGroupSections.filter((section) => section.videos.length > 0);

  // Active always opens; others auto-open/collapse around the threshold until the
  // user manually toggles a panel, after which their choice sticks.
  const collapseAutoExpandThreshold = 5;
  useEffect(() => {
    setActiveGroupKeys((current) => {
      const autoKeys = groupSections
        .filter((section) => !manuallyToggledGroupKeysRef.current.has(section.key))
        .filter((section) => section.key === "active" || section.videos.length <= collapseAutoExpandThreshold)
        .map((section) => section.key);
      const manualKeys = current.filter((key) => manuallyToggledGroupKeysRef.current.has(key));
      const nextKeys = [...new Set([...autoKeys, ...manualKeys])];
      const isUnchanged = nextKeys.length === current.length && nextKeys.every((key) => current.includes(key));
      return isUnchanged ? current : nextKeys;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupSections.map((section) => `${section.key}:${section.videos.length}`).join(",")]);

  return (
    <DashboardContent>
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <div>
          <Title level={2}>Import videos to AnimalMatch</Title>
          <Text type="secondary">
            Select or drag in .mp4 files or folders to check, hash, and upload them.
          </Text>
        </div>

        <Flex gap="large" wrap="wrap" align="stretch">
          <Card style={{ flex: "0 0 380px" }}>
            <div
              role="button"
              tabIndex={0}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") fileInputRef.current?.click();
              }}
              onDragOver={handleDropzoneDragOver}
              onDragLeave={handleDropzoneDragLeave}
              onDrop={handleDropzoneDrop}
              style={{
                border: `2px dashed ${isDraggingOver ? "#0958d9" : "#1677ff"}`,
                borderRadius: 8,
                background: isDraggingOver ? "#e6f4ff" : "#fafafa",
                padding: "32px 24px",
                textAlign: "center",
                cursor: "pointer",
                transition: "border-color 0.2s, background-color 0.2s",
              }}
            >
              <UploadOutlined style={{ fontSize: 32, color: "#1677ff" }} />
              <div style={{ marginTop: 12 }}>
                <Text strong>Click or drag video files or folders here to import</Text>
              </div>
              <Text type="secondary">Supports .mp4 files</Text>
            </div>

            <Flex justify="center" style={{ marginTop: 12 }}>
              <Button type="link" icon={<FolderOpenOutlined />} onClick={() => folderInputRef.current?.click()}>
                or select a folder
              </Button>
            </Flex>

            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,.mp4"
              multiple
              hidden
              onChange={handleFileInputChange}
            />
            <input
              ref={folderInputRef}
              type="file"
              accept="video/mp4,.mp4"
              multiple
              hidden
              onChange={handleFileInputChange}
            />
          </Card>

          {videos.length > 0 && (
            <Card style={{ flex: "1 1 360px" }}>
              <ImportBatchSummary
                counts={{
                  selected: videos.length,
                  checking: checkingCount,
                  ready: readyCount,
                  uploading: uploadingCount,
                  uploaded: uploadedCount,
                  failed: failedCount,
                  skipped: skippedCount,
                }}
                totalSizeLabel={formatFileSize(totalSize)}
                overallPercent={overallPercent}
                uploadedPercent={uploadedPercent}
                isUploading={isUploading}
                uploadableCount={uploadableVideoCount}
                onUpload={uploadReadyVideos}
                onRetryFailed={retryFailedVideos}
                onCancel={cancelUpload}
              />
            </Card>
          )}
        </Flex>

        {videos.length === 0 ? (
          <Card>
            <Text type="secondary">Select videos or a folder to start import.</Text>
          </Card>
        ) : (
          <Collapse
            activeKey={activeGroupKeys}
            onChange={(keys) => {
              const newKeys = keys as VideoGroup[];
              const toggledKeys = [
                ...activeGroupKeys.filter((key) => !newKeys.includes(key)),
                ...newKeys.filter((key) => !activeGroupKeys.includes(key)),
              ];
              toggledKeys.forEach((key) => manuallyToggledGroupKeysRef.current.add(key));
              setActiveGroupKeys(newKeys);
            }}
            items={groupSections.map((section) => {
              const displayedCount = section.key === "active" ? confirmedActiveCount : section.videos.length;

              return {
                key: section.key,
                label: (
                  <Space size={6}>
                    <span>{section.label} ({displayedCount})</span>
                    {pendingCount > 0 && (
                      <Tooltip title={`Still checking ${pendingCount} video${pendingCount === 1 ? "" : "s"}`}>
                        <LoadingOutlined spin />
                      </Tooltip>
                    )}
                  </Space>
                ),
                forceRender: true,
                children: (
                  <Table
                    rowKey="localId"
                    columns={columns}
                    dataSource={section.videos}
                    pagination={{ pageSize: 25, showSizeChanger: true }}
                  />
                ),
              };
            })}
          />
        )}
      </Space>
    </DashboardContent>
  );
};

export default ImportsPage;
