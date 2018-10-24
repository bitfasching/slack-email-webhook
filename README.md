## Node + Docker Hello World, for Showing Good Defaults for Using Node.js in Docker

> This tries to be a "good defaults" example of using Node.js in Docker for local development and shipping to production with all the bells, whistles, and best practices. Issues/PR welcome.

### Local Development Features

 - **Dev as close to prod as you can**. docker-compose builds a local development image that is just like production image except for the below dev-only features needed in image. Goal is to have dev env be as close to test and prod as possible while still giving all the nice tools to make you a happy dev.
 - **Prevent needing node/npm on host**. Installs `node_modules` outside app root in container so local development won't run into a problem of bind-mounting over it with local source code. This means it will run `npm install` once on container build and you don't need to run npm on host or on each docker run. It will re-run on build if you change `package.json`.
 - **One line startup**. Uses `docker-compose up` for single-line build and run of local development server.
 - **Edit locally while code runs in container**. docker-compose uses proper bind-mounts of host source code into container so you can edit locally while running code in Linux container.
 - **Use nodemon in container**. docker-compose uses nodemon for development for auto-restarting node in container when you change files on host.
 - **Enable debug from host to container**. opens the inspect port 9229 for using host-based debugging like chrome tools or VS Code. Nodemon enables `--inspect` by default in docker-compose.
 - **Provides VSCode debug configs and tasks for tests**. for Visual Studio Code fans, `.vscode` directory has the goods, thanks to @JPLemelin.
 - **Small image and quick re-builds**. `COPY` in `package.json` and run `npm install` **before** `COPY` in your source code. This saves big on build time and keep container lean.
 - **Bind-mount package.json**. This allows adding packages in realtime without rebuilding images. e.g. `dce node npm install --save <package name>` (dosn't work on all systems)


### Production-minded Features

 - **Use Docker build-in healthchecks**. uses Dockerfile `HEALTHCHECK` with `/healthz` route to help Docker know if your container is running properly (example always returns 200, but you get the idea).
 - **Proper NODE_ENV use**. Defaults to `NODE_ENV=production` in Dockerfile and overrides to `development` in docker-compose for local dev.
 - **Don't add dev dependencies into production image**. Proper `NODE_ENV` use means dev dependencies won't be installed in container by default. Using docker-compose will build with them by default.
 - **Enables proper SIGTERM/SIGINT for graceful exit**. Defaults to `node index.js` rather then npm for allowing graceful shutdown of node. npm doesn't pass SIGTERM/SIGINT properly (you can't ctrl-c when running `docker run` in foreground). To get `node index.js` to graceful exit, extra signal-catching code is needed. The `Dockerfile` and `index.js` document the options and links to known issues.
 - **Use docker-stack.yml example for Docker Swarm deployments**.


### Assumptions

 - You have Docker and Docker-Compose installed (Docker for Mac, Docker for Windows, get.docker.com and manual Compose installed for Linux).
 - You want to use Docker for local development (i.e. never need to install node/npm on host) and have dev and prod Docker images be as close as possible.
 - You don't want to lose fidelity in your dev workflow. You want a easy environment setup, using local editors, node debug/inspect, local code repo, while node server runs in a container.
 - You use `docker-compose` for local development only (docker-compose was never intended to be a production deployment tool anyway).
 - The `docker-compose.yml` is not meant for `docker stack deploy` in Docker Swarm, it's meant for happy local development. Use `docker-stack.yml` for Swarm.

 
### Getting Started

If this was your Node.js app, to start local development you would:

 - Running `docker-compose up` is all you need. It will:
 - Build custom local image enabled for development (nodemon, `NODE_ENV=development`).
 - Start container from that image with ports 80 and 9229 open (on localhost).
 - Starts with `nodemon` to restart node on file change in host pwd.
 - Mounts the pwd to the app dir in container.
 - If you need other services like databases, just add to compose file and they'll be added to the custom Docker network for this app on `up`.
 - Compose should detect if you need to rebuild due to changed package.json or Dockerfile, but `docker-compose build` works for manually building.
 - Be sure to use `docker-compose down` to cleanup after your done dev'ing.

If you wanted to add a package while docker-compose was running your app:
 - `docker-compose exec node npm install --save <package name>`
 - This installs it inside the running container.
 - Nodemon will detect the change and restart.
 - `--save` will add it to the package.json for next `docker-compose build`

To execute the unit-tests, you would:
 - Execute `docker-compose exec node npm test`, It will:
 - Run a process `npm test` in the container node.
 - You can use the *vscode* to debug unit-tests with config `Docker Test (Attach 9230 --inspect)`, It will:
   - Start a debugging process in the container and wait-for-debugger, this is done by *vscode tasks*
   - It will also kill previous debugging process if existing.

### Other Resources

 - https://blog.hasura.io/an-exhaustive-guide-to-writing-dockerfiles-for-node-js-web-apps-bbee6bd2f3c4

MIT License, 

Copyright (c) 2015-2018 Bret Fisher

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.


=======

# Slack Email Webhook

A lightweight service to get notifications on [Slack](https://slack.com/) for received and sent mail.

- connects to an IMAP account and posts as [incoming webhook](https://api.slack.com/incoming-webhooks)
- can be run as multiple instances to monitor more than one mailbox
- differentiates between received and sent mail

Written in ES2015 with [async](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function)/[await](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/await) from ES2017. Requires [node.js](https://nodejs.org/en/download/current/) 7.6 or newer.


## Getting Started

How to set up your Slack Email Webhook in 5 minutes.
You'll need:

- an email account with IMAP access
- administrative permissions for your Slack team
- a machine with a recent version of node.js to run your Slack Email Webhook (root access not required)

This service has been tested on Debian and Ubuntu, but you should be able to set up your Slack Email Webhook on any system capable of running node.js.

### Creating an Incoming Webhook

First create an incoming webhook for your Slack team.
This will give you a URL where to send your email notifications.
While logged in to your team, go to Apps › Manage › Custom Integrations › Incoming WebHooks and click [Add Configuration](https://slack.com/apps/new/A0F7XDUAZ).

Select a channel where you'd like to receive notifications and click “Add Incoming WebHooks integration”.
You'll be redirected to the configuration page of your new webhook.

Scroll down to “Integration Settings”.
Note the field “Webhook URL” which you'll need in a minute.
You may customize the integration by naming it and setting its icon to a Slack emoji of your taste.

### Installing & Configuration

On your machine, run [npm](https://docs.npmjs.com/) to get the [package](https://www.npmjs.com/package/slack-email-webhook) and its dependencies:

```
$ npm install slack-email-webhook
```

This will install a copy to your current directory under `node_modules/slack-email-webhook`.
Use `npm install --global` to make it available as sytem-wide command.

The file [`config-example.js`](config-example.js) contains an annotated example configuration.
Create a copy and name it `config.js`, then open it in a text editor.
The following settings need to be adjusted before the first run:

- *username* – IMAP username, usually your email address
- *password* – password to log into your email account
- *host* – your provider's IMAP server name (if in doubt, [search](https://duckduckgo.com/?q=imap+settings+yourproviderhere) for it)
- *webhookURL* – the URL of your new integration on Slack

### Quick Start

After configuring the credentials and the webhook URL, you're ready to start the service:

```
$ npm start

> slack-email-webhook@0.1.0 start …
> node slack-email-webhook.js

2017-04-06 00:46 Connecting to imap.gmx.net:993…
2017-04-06 00:46 Selected mailbox "INBOX" containing 3773 mail(s).
2017-04-06 00:46 No unread mails to fetch.
```

In this example, the inbox didn't contain any unread messages.
The service will stay connected to your IMAP account and listen for updates.
A notification will be triggered for any new message.
You can send one or move one from another folder, e.g. from trash.

```
2017-04-06 00:56 Fetching 1 new mail(s)…
2017-04-06 00:56 Sent 1 notification(s) to Slack.
```

![Slack Notification](documentation/screenshots/slack-message.png)

You should have received a notification in Slack!
Press Ctrl+C to stop the service:

```
2017-04-06 00:57 SIGINT, logging out…
2017-04-06 00:57 Exiting…
```

### Running Permanently

A convenient way to run the service permanently is to use some kind of process manager like [pm2](https://www.npmjs.com/package/pm2).
It's able to run your Slack Email Webhook after booting and restart it after unrecoverable runtime errors.

If you don't want to use a third-party process manager, you may as well start Slack Email Webhook manually, redirect its outputs to a log file and put it into background.
In a POSIX-compliant terminal, you could do the following:

```
$ node slack-email-webhook.js >> somename.log 2>&1 &
[1] 25978
```

You get the process' job number and its PID. To bring a process to foreground, use `fg %JOBNUMBER`. To gracefully shut down the service while it's in the background, send a SIGINT signal to its PID:

```
$ kill -INT 25978
```


## Details

### Configuration File

The sample configuration file [`config-example.js`](config-example.js) contains comments for every setting, which should be self-explanatory.
Every key must have a valid value; they will neither be checked nor completed with defaults.
The configuration file is executed and imported as a module using node's `require()`.

### Environment Variables

Two environment variables are considered during start:

- `CONFIG`: Absolute or relative path to the configuration file. Defaults to “./config.js”.
- `MAILBOX`: Name of the mailbox to watch. Overrides the “mailbox” property in the configuration file, if set.

### Process Interface

Slack Email Webhook…

- ignores any command line arguments
- ignores any input via `stdin`
- writes informational messages to `stdout`
- writes error messages to `stderr`
- logs out and exits gracefully on SIGINT signal
- does not return any special exit codes

### Slack Notifications

Notifications sent to Slack are sent as [message attachments](https://api.slack.com/docs/message-attachments).
If the address in the `From:` header matches your account's username, the notification will present the email as outgoing, otherwise as incoming.
Outgoing mail is announced with “Sent mail to …” and a “good” (green) color code.
Incoming mail is announced with “Received mail from …” and a “warning” (orange) color code.
Attachments for incoming mail show the sender's display name and address as author.
The attachment's title and timestamp contain the mail's subject and date, respectively.


## Examples

### Exploring Available Mailboxes

Usually an IMAP account comprises several mailboxes (folders).
The mailbox for incoming mail is commonly called “INBOX”, which is the default mailbox monitored by Slack Email Webhook.
To watch another mailbox, e.g. for sent mail, either specify its name in `config.js` or pass it as environment variable `MAILBOX` when starting the service.

Mailbox names are not standardized.
It's common to store sent mails in “Sent” for example, but this name may vary from client to client, especially in non-English language environments.
Slack Email Webhook retrieves a list of existing mailboxes from the server and checks if the mailbox you wanted is available.
In case it's not, the list is shown in the log.
You may use this to explore the available mailboxes in your account:

```
$ MAILBOX=? node slack-email-webhook.js
2017-04-16 16:48 Connecting to posteo.de:993…
2017-04-16 16:48 Wanted mailbox "?" is not available.
2017-04-16 16:48 Available mailboxes: "Drafts", "Trash", "Sent", "Notes", "INBOX"
2017-04-16 16:48 Exiting…
```

### Two Instances for Received & Sent Mail

You can run multiple instances of Slack Email Webhook if you want to monitor multiple mailboxes.
A common use case would be to forward not only received, but also sent mail to Slack.

This is how you could spawn two Slack Email Webhook instances using [pm2](https://www.npmjs.com/package/pm2) to watch the mailboxes “INBOX” and “Sent” as specified by the environment variable `MAILBOX`:

```
$ MAILBOX=INBOX pm2 start slack-email-webhook.js --name="Mail to Slack: INBOX" --log=inbox.log
$ MAILBOX=Sent  pm2 start slack-email-webhook.js --name="Mail to Slack: Sent"  --log=sent.log
$ pm2 list
┌───────────────────────┬──────┬────────┬───┬─────┬───────────┐
│ Name                  │ mode │ status │ ↺ │ cpu │ memory    │
├───────────────────────┼──────┼────────┼───┼─────┼───────────┤
│ Mail to Slack: INBOX  │ fork │ online │ 0 │ 0%  │ 28.5 MB   │
│ Mail to Slack: Sent   │ fork │ online │ 0 │ 0%  │ 28.4 MB   │
└───────────────────────┴──────┴────────┴───┴─────┴───────────┘
```


## License

Slack Email Webhook can be used, shared and modified under the terms of the [AGPLv3](https://www.gnu.org/licenses/agpl-3.0.html).
