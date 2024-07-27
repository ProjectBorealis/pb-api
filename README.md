# Project Borealis API

Project Borealis web services API for the game, admin panel, developer services, and website.

## Project structure

1. Your main router is defined in `src/index.ts`.
2. Each endpoint has its own file in `src/endpoints/`.
3. For more information read the [chanfana documentation](https://chanfana.pages.dev/) and [Hono documentation](https://hono.dev/docs).

## Development

1. Clone this project and install dependencies with `pnpm install`
2. Run `pnpm dev` to start a local instance of the API.
3. Open `http://localhost:8787/` in your browser to see the Swagger interface where you can try the endpoints.
4. Changes made in the `src/` folder will automatically trigger the server to reload, you only need to refresh the Swagger interface.

## Deployment

Run `pnpm deploy` to publish the API to Cloudflare Workers.
