import React, { useState } from "react";
import PocketBase from 'pocketbase';
import dayjs from "dayjs";
import utc from 'dayjs/plugin/utc';
import Papa from 'papaparse';
dayjs.extend(utc);

const pb = new PocketBase('http://127.0.0.1:8306'); // TODO edit as needed

const csvToJson = (csvText: string) => {
  const results = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  });
  
  if (results.errors.length > 0) {
    alert('Some errors occurred while parsing the CSV. Check the console for details.');
    console.error('CSV parsing errors:', results.errors);
  }
  
  return results.data as Record<string, string>[];
};

const canonicalizeDirname = (dirname: string): string => {
  // convert directory name to canonical form to enable matching
  dirname = dirname.replace(/-/g, '_');               // replace dashes with underscores for consistency
  dirname = dirname.replace(/ CL_/g, 'CL_');          // remove space before 'CL_'
  dirname = dirname.replace(/ RCL_/g, 'RCL_');        // remove space before 'RCL_'
  dirname = dirname.replace(/_RCL_/g, '_CL_');        // change 'RCL' to 'CL' for consistency
  dirname = dirname.replace(/([A-Z])0([0-9])/g, '$1$2'); // remove leading zero (e.g. A09 -> A9)

  // special case: fix typo from spreadsheet
  if (dirname === 'B_CL_K8_L35_April25') {
    dirname = 'B_CL_K8_L35_April24';
  }

  return dirname;
};
const canonicalizeFilepath = (filepath: string): string => {
  // convert filepath to canonical form to enable matching
  const parts = filepath.split('/');
  console.assert(parts.length == 2);
  const [dirname, filename] = parts;
  const canonicalDirname = canonicalizeDirname(dirname);
  return `${canonicalDirname}/${filename}`;
};

const UploadPage: React.FC = () => {
  const [output, setOutput] = useState({
    keptVideos: [] as File[],
    discardedVideos: [] as File[],
    matchedThumbs: [] as File[],
    csvMetadata: [] as Record<string, any>[],
    csvMetadataStringified: "",
  });
  const handleVideosFileListChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    console.log(files);

    if (!files) {
      alert('no files');
      return;
    }
    setOutput({
      ...output,
      keptVideos: [...files].filter(file => file.webkitRelativePath.endsWith(".mp4")).sort(
        (a, b) => a.webkitRelativePath.localeCompare(b.webkitRelativePath, "en")
      ),
      discardedVideos: [...files].filter(file => !file.webkitRelativePath.endsWith(".mp4")),
    });
  };
  const handleThumbsFileListChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    console.log(files);

    if (!files) {
      alert('no files');
      return;
    }
    const filesArray = [...files];
    const matchedThumbs = output.keptVideos.map(videoFile => {
      const videoFilepath = videoFile.webkitRelativePath.replace("loma_chimps_converted/", "");
      const match = filesArray.find(thumbFile => thumbFile.webkitRelativePath.replace("thumbs/", "").replace(".jpg", ".mp4") === videoFilepath);
      if (!match) alert('Match not found for video ' + videoFilepath);
      return match;
    }).filter(x => x != undefined);
    if (matchedThumbs.length === output.keptVideos.length) {
      alert("all videos matched to a thumbnail");
      setOutput({
        ...output,
        matchedThumbs: matchedThumbs,
      });
    }
  };
  const handleMetadataCSVChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    console.log(file);

    if (!file) {
      alert('no file selected');
      return;
    }
    const reader = new FileReader();
    reader.onload = function(e) {
      const text = e.target.result;
      const json = csvToJson(text);
      console.log(json);
      if (json.length === 0) {
        alert('Empty CSV or unable to parse CSV');
        return;
      }
      const matchedMetadata = output.keptVideos.map(videoFile => {
        const videoFilepath = videoFile.webkitRelativePath.replace("loma_chimps_converted/", "");
        const canonicalVideoFilepath = canonicalizeFilepath(videoFilepath);
        const match = json.find(record => (
          `${canonicalizeDirname(record['FolderName-Team_CTLocationName_Sdnumber_month of SD retrieval'])}/${record['Video_Name']}.mp4` === canonicalVideoFilepath
        ));
        if (!match) {
          alert('Match not found for video ' + videoFilepath);
          console.log(canonicalVideoFilepath);
          console.log(json.map(record => `${canonicalizeDirname(record['FolderName-Team_CTLocationName_Sdnumber_month of SD retrieval'])}/${record['Video_Name']}.mp4`));
        }
        return match;
      }).filter(x => x != undefined);
      if (matchedMetadata.length === output.keptVideos.length) {
        alert("all videos matched to metadata");
        setOutput({
          ...output,
          csvMetadata: matchedMetadata,
          csvMetadataStringified: JSON.stringify(matchedMetadata, null, 2),
        });
      }
    };
    reader.readAsText(file);
  };

  const handleSubmit = async () => {
    if (output.keptVideos.length === 0 || output.matchedThumbs.length === 0 || output.csvMetadata.length === 0) {
      alert("missing data");
      return;
    }
    if (!(output.keptVideos.length === output.matchedThumbs.length && output.keptVideos.length === output.csvMetadata.length)) {
      alert("videos not matched to thumbnails or metadata");
      return;
    }

    for (let i = 0; i < output.keptVideos.length; i++) {
      const videoFile = output.keptVideos[i];
      const thumbFile = output.matchedThumbs[i];
      const metadata = output.csvMetadata[i];

      const recording_date = dayjs.utc(
        metadata["Date"] + " " + metadata["Time"],
        ["M/D/YYYY h:mm:ss A", "M/D/YYYY H:mm:ss", "M/D/YYYY HH:mm", "M/D/YYYY H:mm"],
        true, // strict mode
      ).format("YYYY-MM-DD HH:mm:ss.SSS[Z]");
      if (recording_date === "Invalid Date") {
        alert('Invalid recording date for video ' + videoFile.webkitRelativePath + ": " + metadata["Date"] + " " + metadata["Time"]);
      }
      const month_of_SD_retrieval = {
        "Feb23-April23": "Apr 2023",
        "April23-June23": "Jun 2023",
        "Nov23-Jan24": "Jan 2024",
        "Jan24-April24": "Apr 2024",
      }[metadata["Period"] as string];

      const dataToSubmit = {
        filename: videoFile.webkitRelativePath.replace("loma_chimps_converted/", ""),
        file: videoFile,
        thumbnail: thumbFile,
        location_name: metadata["CL-Name"],
        recording_date: recording_date,
        month_of_SD_retrieval: month_of_SD_retrieval,
        habitat: metadata["Habitat"],
        utm_easting: metadata["X"],
        utm_northing: metadata["Y"],
        altitude: metadata["Altitude"],
        num_individuals: parseInt(metadata["nb_object"]),
        notes: metadata["remarks"],
        custom_tags: [],
        annotation_status: "to annotate",
        // omitted `assignees` and `individuals`
      };
      console.log('Uploading data', dataToSubmit);
      await pb.collection("videos").create(dataToSubmit);
      // break; // TODO uncomment for testing
    }
  }

  return <>
    <span>Select videos folder:</span>
    <input type="file" id="videosFileList" name="videosFileList" webkitdirectory="" multiple onChange={handleVideosFileListChange} />
    <br />
    <span>Select thumbnails folder:</span>
    <input type="file" id="thumbsFileList" name="thumbsFileList" webkitdirectory="" multiple onChange={handleThumbsFileListChange} />
    <br />
    <span>Select metadata CSV:</span>
    <input type="file" id="metadataFileInput" name="metadataFileInput" onChange={handleMetadataCSVChange} />
    <br />
    <button onClick={handleSubmit}>Submit</button>
    <div style={{display: 'flex'}}>
      <div style={{width: '50%'}}>
        <p>Discarded videos ({output.discardedVideos.length})</p>
        <pre style={{height: 150, overflow: "scroll", background: "#eee"}}>
          {output.discardedVideos.map(file => file.webkitRelativePath).join('\n')}
        </pre>
        <p>Kept videos ({output.keptVideos.length})</p>
        <pre style={{height: 300, overflow: "scroll", background: "#eee"}}>
          {output.keptVideos.map(file => file.webkitRelativePath).join('\n')}
        </pre>
        <p>Matched thumbs ({output.matchedThumbs.length})</p>
        <pre style={{height: 300, overflow: "scroll", background: "#eee"}}>
          {output.matchedThumbs.map(file => file.webkitRelativePath).join('\n')}
        </pre>
      </div>
      <div style={{width: '50%'}}>
        <p>Metadata ({output.csvMetadata.length})</p>
        <pre style={{height: 600, overflow: "scroll", background: "#eee"}}>
          {output.csvMetadataStringified}
        </pre>
      </div>
    </div>
  </>
}

export default UploadPage;