# AnimalMatch frontend

This frontend web app is implemented with React and TypeScript + SASS + HTML. Here are some other key libraries used:
* UI component library: [Ant Design](https://ant.design/)
* Client-side routing: [React Router v6](https://reactrouter.com/6.30.2)
* Global state management: [Zustand](https://github.com/pmndrs/zustand)
* JS utility library: [es-toolkit](https://es-toolkit.dev) (similar to Lodash)

## Development setup
### Prerequisites
- Make sure you have [npm](https://docs.npmjs.com/about-npm) installed beforehand. If you do not have `npm` installed, we recommend installing [nvm (Node Version Manager)](https://github.com/nvm-sh/nvm#install--update-script) first and then running `nvm install node` to install `npm` and `node`.
- Clone this repo, `cd` into this directory and then run `npm install` to install the project dependencies

### Start development server
1. Make sure you have completed the prerequisite steps above, and `cd`'ed into this directory if you haven't already done so
2. Start the development server using `npm run dev`. Once the server is running, open `localhost:5173` in your browser to access the development version of the frontend

For now you might need to comment out the video annotation route ([lines 125-128](https://github.com/horaceleedev/AnimalMatch/blob/d6a739edaba43a068124cd8c73ba0b876a6cb32c/src/main.tsx#L125-L128) in main.tsx) in order for the frontend to work.

### Production build
TODO

## Testing

Testing uses `Vitest` for fast `jsdom` tests, `Vitest Browser Mode` for browser-backed component tests, and `Playwright` for E2E.
All tests live under `/tests`, including Playwright specs in `/tests/e2e`.

- `npm run test` for the vitest component and ts unit tests
- `npm run test:browser` for vitest browser-mode component tests
- `npm run test:e2e` for Playwright E2E tests

First time setup: run `npx playwright install chromium` once before either the browser-mode or pw tests.

## React Components

Here is a diagram showing the key React components in this codebase:

(The diagram might not be reflect some recent changes in the codebase / it is not fully up to date)

<img src="docs/react-components-diagram.svg">

Note:
- An arrow from A->B indicates that component B is used in component A. "Through Outlet" means that one component is displayed within another component via a React Router `<Outlet>`.
- Rounded rectangles represent 'dumb' components (i.e. presentational components) that don't have direct access to the global state
- Some minor components were not included in the diagram:
  - QueryOperationsButtons
  - VideoLinkButton, IndividualLinkButton
  - BasicMapView
  - InnerModal
  - etc

# Original README created by Vite (TODO remove this later):

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type aware lint rules:

- Configure the top-level `parserOptions` property like this:

```js
export default tseslint.config({
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

- Replace `tseslint.configs.recommended` to `tseslint.configs.recommendedTypeChecked` or `tseslint.configs.strictTypeChecked`
- Optionally add `...tseslint.configs.stylisticTypeChecked`
- Install [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) and update the config:

```js
// eslint.config.js
import react from 'eslint-plugin-react'

export default tseslint.config({
  // Set the react version
  settings: { react: { version: '18.3' } },
  plugins: {
    // Add the react plugin
    react,
  },
  rules: {
    // other rules...
    // Enable its recommended rules
    ...react.configs.recommended.rules,
    ...react.configs['jsx-runtime'].rules,
  },
})
```
