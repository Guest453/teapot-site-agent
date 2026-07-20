# Teapot Site Agent

A Discord slash command that asks an OpenAI model to edit a static website, commits the validated result to a branch, and opens a GitHub pull request. Merging the PR deploys `site/` through GitHub Pages.

## Architecture

1. A member of the configured Discord server runs `/site prompt: add a gallery` in Discord.
2. Discord sends a signed HTTP interaction to this service.
3. The service reads only `site/` from GitHub and asks the model for structured file replacements.
4. Local policy rejects traversal, non-site files, unsupported file types, oversized edits, duplicate paths, remote scripts/assets, iframes, form endpoints, and obvious remote data requests.
5. The service creates one commit and one pull request. With `AUTO_MERGE=true`, it also attempts a squash merge.
6. The Pages workflow deploys `site/` from `main`.

The bot service itself must run on a public Node.js host; GitHub Pages only serves the static website.

## Setup

### 1. GitHub

- Create a repository and push this project to its `main` branch.
- In **Settings > Pages > Build and deployment**, select **GitHub Actions**.
- Set the Pages custom domain to `cesustheteapot.dpdns.org` in repository settings.
- In your DNS provider, point the subdomain to `<your-github-user>.github.io` with a CNAME record.
- Create a fine-grained token restricted to this one repository with Contents and Pull requests read/write permissions.

### 2. Discord

- Create an application at the Discord Developer Portal and add it to your server.
- Copy the Application ID, Public Key, and bot token.
- Expose this PC through a public HTTPS tunnel, then set the Discord Interactions Endpoint URL to `https://YOUR-PUBLIC-HOST/interactions`.
- Copy `.env.example` to `.env`, fill the values, and run `npm run register`. The scripts load `.env` automatically. `DISCORD_GUILD_ID` also makes the command appear in that server immediately.
- Set `DISCORD_GUILD_ID` to your server ID. Any member of that server can use `/site`; interactions from other servers are rejected.

### 3. OpenAI and bot hosting

- Create an OpenAI API key and store it in the bot host as `OPENAI_API_KEY`.
- Store every value from `.env.example` in the bot host's secret/environment settings.
- Install and start with `npm install` and `npm start`. Keep that terminal and the HTTPS tunnel running while the bot is online.
- Configure the host's health check as `/health`.

Never expose the Discord bot token, GitHub token, or OpenAI API key in Discord, GitHub files, or the Pages site.

## Local checks

```sh
npm install
npm test
```

The server intentionally fails at startup when required secrets are missing.
