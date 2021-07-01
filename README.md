# CRO live development server with 🔥 hot-reloading

## Setup
- Make sure you have [Node JS](https://nodejs.org/en/) installed
- Install the package globally by using `npm i -g @conversiondev/engine`. This will give you access to the `cro` command (CLI).

---

## Create an experiment
### Main steps
- In any directory on your machine type `cro s path/to/exp`.

  If the experiment at `path/to/exp` exists the dev server will start up, otherwise it will prompt you to confirm creating a new experiment file structure in `path/to/exp`

- Once the above is done there will be a new file created in `path/to/exp/__dev/client.js`. Code in this file is used to make the live connection between the client site and the development server.

- Create a new experiment on the CRO platform (e.g. Optmizely, Kameleoon etc.) and paste the contents of `path/to/exp/__dev/client.js` into the JavaScript section.

- Preview the experiment with the dev server running and you should now have a development environment with hot-reload

- Once finished you can copy over code from `path/to/exp/index.js` & `path/to/exp/index.css` to the CRO platform

### JavaScript concepts
- The entry file for JavaScript is `path/to/exp/source/index.ts`. As you might guess you are free to use [TypeScript](https://www.typescriptlang.org/) in the experiments. All of the code will be bundled and compiled to ES5 JavaScript.

- You can install and import packages from NPM - this allows you to reuse code with proper package versioning.

- You can split up your code into multiple logical files and then import them into `path/to/exp/source/index.ts`. This way you can write more complex experiments without having to fit everything into a single JS file.

- Every time you'll make a change in your code, the compiled JavaScript will be re-inserted (hot-reload) useng a [WebSocket](https://en.wikipedia.org/wiki/WebSocket) connection established by the code in `path/to/exp/__dev/client.js`.

  This means if you're adding new elements to the page the server will add a new element every time you update your code. To fix this you can write some cleanup logic to `path/to/exp/__dev/cleanup.js`. E.g.:
  ```Javascript
  document.querySelectorAll('.inserted-element-selector').forEach($item => $item.remove());
  ```

  The server will inject this cleanup code before executing the experiment code. This is only used in development and is not included in the final compiled code in `path/to/exp/index.js`.

### CSS concepts
- The entry file for CSS is `path/to/exp/source/index.scss`. As you might guess you are free to use [SASS (SCSS)](https://sass-lang.com/) in the experiments. All of the code will be bundled and compiled to regular CSS.

- You can split up your code into multiple logical files and then import them into `path/to/exp/source/index.scss`. This way you can write more complex experiments without having to fit everything into a single CSS file.

- Every time you'll make a change in your code, the compiled CSS will be re-inserted (hot-reload) useng a [WebSocket](https://en.wikipedia.org/wiki/WebSocket) connection established by the code in `path/to/exp/__dev/client.js`.

---
## Asset optimization

You can optimize assets by running `cro o path/to/assets`. This will:
- Find any SVG files and create a minified version in a `min` directory next to the minified file.

  E.g. to minify `path/to/assets/icon-1.svg` & `path/to/assets/icon-2.svg` you would run `cro o path/to/assets` and it will create `path/to/assets/min/icon-1.svg` & `path/to/assets/min/icon-2.svg`.

- Find any PNG/JPEG files and create a WEBP version in a `webp` directory next to the minified file.

  E.g. to minify `path/to/assets/bg-1.png` & `path/to/assets/bg-2.png` you would run `cro o path/to/assets` and it will create `path/to/assets/webp/bg-1.webp` & `path/to/assets/webp/bg-2.webp`.

- You can expect a 40-80% file size saving without losing any quality.