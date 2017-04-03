module.exports = {

    /* :: IMAP Server Credentials :: */

    // usually the same as your email address
    username: "user@provider.net",

    // plaintext password (encrypted during transport by TLS)
    password: "password",


    /* :: IMAP Server Connection :: */

    // IMAP hostname, usually at the subdomain imap.* of you provider
    host: "imap.provider.net",

    // IMAP over TLS default is 993
    port: 993,

    // if not connecting to a TLS port, force use of STARTTLS?
    requireTLS: true,


    /* :: Email Retrieval :: */

    // mailbox (folder) to watch
    mailbox: "INBOX",

    // fetch unread mails on startup?
    fetchUnread: true,

    // truncate fetched mail to this many bytes
    // (may lead to content parsing errors, but avoid DoS)
    sizeLimit: 10 * 1024,


    /* :: Slack :: */

    // Incoming WebHooks URL as created here:
    // https://slack.com/apps/A0F7XDUAZ-incoming-webhooks
    webhookURL: "https://hooks.slack.com/services/…",

    // show CC and BCC addresses in Slack notifications?
    showCopy: true,
}
