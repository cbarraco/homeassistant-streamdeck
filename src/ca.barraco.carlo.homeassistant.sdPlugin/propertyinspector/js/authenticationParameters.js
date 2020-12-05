window.addEventListener(
    "message",
    function (ev) {
        console.log(
            "External window received message:  ",
            ev.data,
            typeof ev.data
        );
        doSomething(ev.data);
    },
    false
);

/**
 * There are various methods to exchange messages with an external window,
 * two of which are illustrated below.
 */

/**
 *  A BroadcastChannel can be used to distribute a message to another listener
 * on the same origin - e.g. the Property Inspector.
 * Advantage here is, you don't need to keep a window-reference in the Property Inspector
 * to send/receive data to/from the external window
 */

var bc = new BroadcastChannel("streamdeck_broadcast_message");
var j = 0;
function loaded() {
    /**
     * Here we listen to an incoming message on the BroadcastChannel, which was
     * instantiated a bit earlier (see above)
     */
    bc.onmessage = function (ev) {
        // doSomething(ev.data);
    };

    setTimeout(() => {
        // this is just a quick message to Property Inspector (you should see it in the console)
        window.opener.gotCallbackFromWindow(
            "Message from window: " +
                new Date().toLocaleTimeString()
        );
    }, 1000);
}

function sendmessage() {
    /* this one is sent using the BroadcastChannel-API */
    bc.postMessage("button clicked " + j);

    /**
     * You can also use a 'postMessage' event, where you send a message to
     * a *globally* available function in the Property Inspector's window.
     * In this case: 'gotCallbackFromWindow'.
     * */

    window.opener.gotCallbackFromWindow(
        "button clicked (callback) " + j
    );
    j++;
}

$SD.on("connected", (jsn) => {
    logStreamDeckEvent(jsn);

    settings = Utils.getProp(
        jsn,
        "actionInfo.payload.settings",
        false
    );
    if (settings) {
        updateUI(settings);
    }
});