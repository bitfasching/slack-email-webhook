/**
 * Slack Email Webhook
 *
 * Get notifications in Slack for received and sent mail.
 * Written in ES2015 and with async/await from ES2017.
 *
 * Nick Schwarzenberg
 * nick@bitfasching.de
 * v0.1.1, 04/2017
 *
 * License: AGPLv3
 */

'use strict'


// external module dependencies
const console    = require( 'timestamped-console' )( 'yyyy-mm-dd HH:MM' )
const ImapClient = require( 'emailjs-imap-client' )
const Envelope   = require( 'envelope' )

// built-in module dependencies
const HTTPS      = require( 'https' )
const URL        = require( 'url' )

// load configuration, optionally from path set as environment variable
const config = require( process.env.CONFIG || './config.js' )

// overwrite mailbox setting if set as environment variable
config.mailbox = process.env.MAILBOX || config.mailbox

// parse webhook URL only once
config.webhookURL = URL.parse( config.webhookURL )

// mention in the log when process exits
process.on( 'exit', () => console.log( "Exiting…" ) )


// main logic
async function main()
{
    // tell what's happening
    console.log( "Connecting to %s:%d…", config.host, config.port )

    // connect to server
    const client = await connect()

    // listen for fatal errors
    client.onerror = ( error ) =>
    {
        // log fatal error and exit
        console.error( "Fatal IMAP client error!" )
        console.error( error )
        process.exit()
    }

    // listen for process kill events
    process.on( 'SIGINT', () =>
    {
        // …and logout before exiting
        console.log( "SIGINT, logging out…" )
        client.logout()
        process.exit()
    })

    // get available mailboxes
    const availableMailboxes = await listMailboxes( client )

    // wanted mailbox not available?
    if ( !availableMailboxes.includes( config.mailbox ) )
    {
        // fail with error, but list available mailboxes for convenience
        console.error( "Wanted mailbox \"%s\" is not available.", config.mailbox )
        console.log( "Available mailboxes: %s", availableMailboxes.map( ( name ) => `"${name}"` ).join( ', ' ) )
        process.exit()
    }

    // get initial number of mails
    let cachedMailCount = await queryMailbox( client )

    // show mailbox size
    console.log( "Selected mailbox \"%s\" containing %s mail(s).", config.mailbox, cachedMailCount !== undefined ? cachedMailCount : '?' )

    // fetch all unread mails?
    if ( config.fetchUnread )
    {
        // get sequence numbers of unread mails
        const unreadMails = await client.search( config.mailbox, { unseen: true } )

        // any unread mails?
        if ( unreadMails && unreadMails.length > 0 )
        {
            // tell what's happening
            console.log( "Fetching %d unread mail(s)…", unreadMails.length )

            // fetch unread mails
            await fetchMails( client, unreadMails )
        }
        else
        {
            // also tell what's not happening
            console.log( "No unread mails to fetch." )
        }
    }

    // stay updated
    client.onupdate = async ( path, type, value ) =>
    {
        // ignore if wrong path
        if ( path != config.mailbox ) return

        // mail deleted?
        if ( type == 'expunge' )
        {
            // decrease cached mail count
            cachedMailCount--
        }

        // new mails?
        if ( type == 'exists' && value > cachedMailCount )
        {
            // get new mail count
            const currentMailCount = value

            // create array of sequence numbers to fetch
            let newMails = getRange( cachedMailCount+1, currentMailCount )

            // tell what's happening
            console.log( "Fetching %d new mail(s)…", newMails.length )

            // fetch new mails
            await fetchMails( client, newMails )

            // update cached mail count
            cachedMailCount = currentMailCount
        }
    }
}


// connect to IMAP server
async function connect()
{
    // create new ImapClient instance
    const client = new ImapClient( config.host, config.port, {
        auth: {
            user: config.username,
            pass: config.password,
        },
        requireTLS: config.requireTLS,
    })

    // disable internal logging
    client.logLevel = client.LOG_LEVEL_NONE

    try
    {
        // open connection to server
        await client.connect()
        return client
    }
    catch ( error )
    {
        // fail with error
        console.error( "Could not connect to %s:%d!", config.host, config.port )
        console.error( error )
        process.exit()
    }
}


// get list of available mailbox paths
async function listMailboxes( client )
{
    try
    {
        // try to list mailboxes
        const list = await client.listMailboxes()

        // pattern for matching path specifications
        const pathPattern = '"path":\s*"([^"]+)"'

        // flatten nested object the dirty way and find mentioned paths
        const pathMatches = JSON.stringify( list ).match( new RegExp( pathPattern, 'g' ) )

        // extract paths from matches
        const paths = pathMatches.map( ( match ) => match.replace( new RegExp( pathPattern ), '$1' ) )

        // try to get paths from available mailboxes
        return paths
    }
    catch ( error )
    {
        // fail with error
        console.error( "Could not list mailboxes!" )
        console.error( error )
        process.exit()
    }
}


// get number of existing mails in the mailbox
async function queryMailbox( client )
{
    try
    {
        // try to get mailbox status
        const status = await client.selectMailbox( config.mailbox )

        // return number of existing mails
        return Number( status.exists )
    }
    catch ( error )
    {
        // fail with error
        console.error( "Could not query mailbox status of \"%s\"!", config.mailbox )
        console.error( error )
        process.exit()
    }
}


// fetch mails by sequence numbers
async function fetchMails( client, ids, removeSeen )
{
    // notifications to send to Slack
    let notifications = []

    // for each sequence number…
    for ( let id of ids )
    {
        // try to fetch the mail and turn it into a Slack notification
        const notification = await mailToNotification( client, id )

        // add to list of new notifications if successful
        notification && notifications.push( notification )
    }

    // send notifications to Slack if any
    sendToSlack( notifications )
}


// fetch mail by its sequence number, parse and turn into a Slack notification
async function mailToNotification( client, id )
{
    // processed header, unprocessed body
    let header = {}
    let rawBody = ''

    try
    {
        // try to fetch header and content from server
        const messageItems = await client.listMessages( config.mailbox, id, [ 'envelope', `body[]<0.${config.sizeLimit}>` ] )
        header  = messageItems[0]['envelope']
        rawBody = messageItems[0]['body[]']
    }
    catch ( error )
    {
        // log error and return
        console.error( "Could not fetch mail #%d!", id )
        console.error( error )
        return
    }

    // plaintext content
    let content = ''

    try
    {
        // try to parse MIME tree of contents
        const contentTree = new Envelope( rawBody )

        // try to find plaintext content
        content = findTextContent( contentTree )
    }
    catch ( error )
    {
        // log error, but move on
        console.error( "Could not parse content of mail #%d.", id )
        console.error( error )
    }

    // create Slack notification with common content
    const notification = {
        title: header.subject,
        text: content || "_Sorry, no text available._",
        footer: config.username,
        ts: Date.parse( header.date ) / 1000,
        mrkdwn_in: [ 'text' ],
    }

    // incoming mail?
    if ( header.from[0].address != config.username )
    {
        // return notification for incoming mail
        return Object.assign( notification, {
            fallback: `Received mail from ${header.from[0].address}`,
            pretext: `Received mail from ${header.from[0].address}.`,
            color: 'warning',
            author_name: header.from[0].name || header.from[0].address,
            author_link: `mailto:${header.from[0].address}`,
        })
    }
    else
    {
        // header fields for receiving people
        let receivers = [].concat( header.to )

        // show copy headers?
        if ( config.showCopy )
        {
            // add CC and BCC headers if present
            header.cc  && receivers.push( header.cc )
            header.bcc && receivers.push( header.bcc )
        }

        // only use addresses from headers
        let addresses = receivers.reduce( (reduced,current) => reduced.concat([current.address]), [] )

        // return notification for outgoing mail
        return Object.assign( notification, {
            fallback: `Sent mail to ${addresses.join(', ')}`,
            pretext: `Sent mail to ${addresses.join(', ')}.`,
            color: 'good',
        })
    }
}


// assume most common MIME tree to recursively find plaintext in a multipart mail parsed by envelope
function findTextContent( parts )
{
    // check if passed parts object contains desired plaintext content
    if ( parts.header && parts.header.contentType && parts.header.contentType.mime == 'text/plain' )
    {
        // return plaintext
        return parts['0']
    }
    // more levels to check?
    else if ( parts['0'] && parts['0'].header )
    {
        // recurse to deeper level
        return findTextContent( parts['0'] )
    }
    // nothing found
    else
    {
        // create error, but remove Stack trace
        const flatError = new Error( "Could not find text/plain content in MIME tree." )
        delete flatError.stack

        // throw error
        throw flatError
    }
}


// send an array of one or more notifications to a Slack webhook
function sendToSlack( notifications )
{
    // return if no notifications to send
    if ( notifications.length == 0 ) return

    // create payload for POST request
    let payload = JSON.stringify( { attachments: notifications } )

    // apply required entity encoding
    payload = payload.replace( '&', '&amp;' ).replace( '<', '&lt;' ).replace( '>', '&gt;' )

    // POST parameters for JSON webhook
    const postParameters = {
        method: 'POST',
        host: config.webhookURL.host,
        path: config.webhookURL.path,
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength( payload ),
        },
    }

    return new Promise( ( resolve, reject ) =>
    {
        // start request to Slack
        const request = HTTPS.request( postParameters, ( response ) =>
        {
            // check status code
            if ( response.statusCode == 200 )
            {
                // all good
                console.log( "Sent %d notification(s) to Slack.", notifications.length )
            }
            else
            {
                // log error, but don't do anything about it
                console.error( "Slack returned unexpected status code %d.", response.statusCode )
            }

            // resolve Promise regardless of possible errors
            resolve()
        })

        // send payload
        request.write( payload )
        request.end()
    })
}


// helper: return array of number range from start to end, both inclusive
function getRange( start, end )
{
    return Array.from(
        { length: end - start + 1 },
        ( element, index ) => index + start
    )
}


// go!
main()
