/* global addDynamicStyles, $SD, Utils */

var onchangeevt = "onchange"; // 'oninput';

let sdpiWrapper = document.querySelector(".sdpi-wrapper");
let settings = {};

document.addEventListener("DOMContentLoaded", function () {
    document.body.classList.add(
        navigator.userAgent.includes("Mac") ? "mac" : "win"
    );
    prepareDOMElements();
});

function saveSettings(sdpi_collection) {
    if (typeof sdpi_collection !== "object") return;

    if (sdpi_collection.hasOwnProperty("key") && sdpi_collection.key != "") {
        if (sdpi_collection.value && sdpi_collection.value !== undefined) {
            window.opener.gotCallbackFromWindow(JSON.stringify(sdpi_collection));
        }
    }
}

$SD.on("piDataChanged", (returnValue) => {
    logStreamDeckEvent(returnValue);

    if (returnValue.key === "authenticationParametersEnterCredentials") {
        postMessage = (w) => {
            w.postMessage(
                Object.assign({}, $SD.applicationInfo.application, {
                    action: $SD.actionInfo.action,
                }),
                "*"
            );
        };

        if (!window.xtWindow || window.xtWindow.closed) {
            window.xtWindow = window.open(
                "authenticationParameters.html",
                "Authentication Parameters"
            );
            setTimeout(() => postMessage(window.xtWindow), 200);
        } else {
            postMessage(window.xtWindow);
        }
    } else {
        saveSettings(returnValue);
    }
});

function prepareDOMElements(baseElement) {
    baseElement = baseElement || document;
    Array.from(baseElement.querySelectorAll(".sdpi-item-value")).forEach(
        (el, i) => {
            const elementsToClick = [
                "BUTTON",
                "OL",
                "UL",
                "TABLE",
                "METER",
                "PROGRESS",
                "CANVAS",
            ].includes(el.tagName);
            const evt = elementsToClick ? "onclick" : onchangeevt || "onchange";

            const inputGroup = el.querySelectorAll("input + span");
            if (inputGroup.length === 2) {
                const offs = inputGroup[0].tagName === "INPUT" ? 1 : 0;
                inputGroup[offs].textContent = inputGroup[1 - offs].value;
                inputGroup[1 - offs]["oninput"] = function () {
                    inputGroup[offs].textContent = inputGroup[1 - offs].value;
                };
            }

            Array.from(el.querySelectorAll(".clickable")).forEach(
                (subel, subi) => {
                    subel["onclick"] = function (e) {
                        handleSdpiItemChange(e.target, subi);
                    };
                }
            );

            const cloneEvt = el[evt];
            el[evt] = function (e) {
                if (cloneEvt) cloneEvt();
                handleSdpiItemChange(e.target, i);
            };
        }
    );

    baseElement.querySelectorAll("textarea").forEach((e) => {
        const maxl = e.getAttribute("maxlength");
        e.targets = baseElement.querySelectorAll(`[for='${e.id}']`);
        if (e.targets.length) {
            let fn = () => {
                for (let x of e.targets) {
                    x.textContent = maxl
                        ? `${e.value.length}/${maxl}`
                        : `${e.value.length}`;
                }
            };
            fn();
            e.onkeyup = fn;
        }
    });

    baseElement.querySelectorAll("[data-open-url").forEach((e) => {
        const value = e.getAttribute("data-open-url");
        if (value) {
            e.onclick = () => {
                let path;
                if (value.indexOf("http") !== 0) {
                    path = document.location.href.split("/");
                    path.pop();
                    path.push(value.split("/").pop());
                    path = path.join("/");
                } else {
                    path = value;
                }
                $SD.api.openUrl($SD.uuid, path);
            };
        } else {
            console.log(`${value} is not a supported url`);
        }
    });
}

function handleSdpiItemChange(e, idx) {
    if (["OL", "UL", "TABLE"].includes(e.tagName)) {
        return;
    }

    if (e.tagName === "SPAN") {
        const inp = e.parentNode.querySelector("input");
        var tmpValue;

        if (!e.hasAttribute("value")) {
            tmpValue = Number(e.textContent);
            if (typeof tmpValue === "number" && tmpValue !== null) {
                e.setAttribute("value", 0 + tmpValue); // this is ugly, but setting a value of 0 on a span doesn't do anything
                e.value = tmpValue;
            }
        } else {
            tmpValue = Number(e.getAttribute("value"));
        }

        if (inp && tmpValue !== undefined) {
            inp.value = tmpValue;
        } else return;
    }

    const selectedElements = [];
    const isList = ["LI", "OL", "UL", "DL", "TD"].includes(e.tagName);
    const sdpiItem = e.closest(".sdpi-item");
    const sdpiItemGroup = e.closest(".sdpi-item-group");
    let sdpiItemChildren = isList
        ? sdpiItem.querySelectorAll(e.tagName === "LI" ? "li" : "td")
        : sdpiItem.querySelectorAll(".sdpi-item-child > input");

    if (isList) {
        const siv = e.closest(".sdpi-item-value");
        if (!siv.classList.contains("multi-select")) {
            for (let x of sdpiItemChildren) x.classList.remove("selected");
        }
        if (!siv.classList.contains("no-select")) {
            e.classList.toggle("selected");
        }
    }

    if (
        sdpiItemChildren.length &&
        ["radio", "checkbox"].includes(sdpiItemChildren[0].type)
    ) {
        e.setAttribute("_value", e.checked); //'_value' has priority over .value
    }
    if (sdpiItemGroup && !sdpiItemChildren.length) {
        for (let x of ["input", "meter", "progress"]) {
            sdpiItemChildren = sdpiItemGroup.querySelectorAll(x);
            if (sdpiItemChildren.length) break;
        }
    }

    if (e.selectedIndex) {
        idx = e.selectedIndex;
    } else {
        sdpiItemChildren.forEach((ec, i) => {
            if (ec.classList.contains("selected")) {
                selectedElements.push(ec.textContent);
            }
            if (ec === e) {
                idx = i;
                selectedElements.push(ec.value);
            }
        });
    }

    const returnValue = {
        key: e.id && e.id.charAt(0) !== "_" ? e.id : sdpiItem.id,
        value: isList
            ? e.textContent
            : e.hasAttribute("_value")
            ? e.getAttribute("_value")
            : e.value
            ? e.type === "file"
                ? decodeURIComponent(e.value.replace(/^C:\\fakepath\\/, ""))
                : e.value
            : e.getAttribute("value"),
        group: sdpiItemGroup ? sdpiItemGroup.id : false,
        index: idx,
        selection: selectedElements,
        checked: e.checked,
    };

    if (e.type === "file") {
        const info = sdpiItem.querySelector(".sdpi-file-info");
        if (info) {
            const s = returnValue.value.split("/").pop();
            info.textContent =
                s.length > 28
                    ? s.substr(0, 10) +
                      "..." +
                      s.substr(s.length - 10, s.length)
                    : s;
        }
    }

    $SD.emit("piDataChanged", returnValue);
}
