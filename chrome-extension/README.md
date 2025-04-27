This is a [Plasmo extension](https://docs.plasmo.com/) project bootstrapped with [`plasmo init`](https://www.npmjs.com/package/plasmo).

## Getting Started

First, run the development server:

```bash
pnpm dev
# or
npm run dev
```

Open your browser and load the appropriate development build. For example, if you are developing for the chrome browser, using manifest v3, use: `build/chrome-mv3-dev`.

You can start editing the popup by modifying `popup.tsx`. It should auto-update as you make changes. To add an options page, simply add a `options.tsx` file to the root of the project, with a react component default exported. Likewise to add a content page, add a `content.ts` file to the root of the project, importing some module and do some logic, then reload the extension on your browser.

For further guidance, [visit our Documentation](https://docs.plasmo.com/)

## Environment Configuration

The extension uses environment variables to configure the backend API URL:

- `.env.development` - Used during development (`npm run dev`)
- `.env.production` - Used for production builds (`npm run build`)

### API URL Configuration

You can switch between local and AWS backend URLs by changing the `PLASMO_PUBLIC_USE_AWS_API` flag:

```
# Use local backend
PLASMO_PUBLIC_USE_AWS_API=false

# Use AWS backend
PLASMO_PUBLIC_USE_AWS_API=true
```

The URLs themselves are also configurable:

```
PLASMO_PUBLIC_LOCAL_API_URL=http://localhost:8000/api/v1
PLASMO_PUBLIC_AWS_API_URL=https://y3otceq5rh.execute-api.us-east-2.amazonaws.com/api/v1
```

After changing environment variables, you need to restart the development server or rebuild the extension for the changes to take effect.

## Making production build

Run the following:

```bash
pnpm build
# or
npm run build
```

This should create a production bundle for your extension, ready to be zipped and published to the stores.

## Submit to the webstores

The easiest way to deploy your Plasmo extension is to use the built-in [bpp](https://bpp.browser.market) GitHub action. Prior to using this action however, make sure to build your extension and upload the first version to the store to establish the basic credentials. Then, simply follow [this setup instruction](https://docs.plasmo.com/framework/workflows/submit) and you should be on your way for automated submission!
