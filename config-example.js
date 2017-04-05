module.exports = {

    /* :: IMAP Account Credentials :: */

    // should be the same as your email address
    username: "user@provider.net",

    // plaintext password (will be encrypted during transport by TLS)
    password: "password",


    /* :: IMAP Server Connection :: */

    // IMAP server hostname
    // (usually at the subdomain imap.* of your provider)
    host: "imap.provider.net",

    // IMAP over TLS uses port 993 as default
    port: 993,

    // if not connecting to a TLS port, force use of STARTTLS?
    requireTLS: true,


    /* :: Email Retrieval :: */

    // mailbox (folder) to watch
    // (will show available mailboxes if specified name not found)
    mailbox: "INBOX",

    // fetch unread mails on startup?
    fetchUnread: true,

    // truncate fetched mail to this many bytes
    // (may fail to extract content for large messages, but helps to avoid DoS)
    sizeLimit: 10 * 1024,


    /* :: Slack :: */

    // Incoming WebHooks URL as created here:
    // https://slack.com/apps/A0F7XDUAZ-incoming-webhooks
    webhookURL: "https://hooks.slack.com/services/…",

    // show CC and BCC addresses in Slack notifications?
    // (
    showCopy: true,
}
