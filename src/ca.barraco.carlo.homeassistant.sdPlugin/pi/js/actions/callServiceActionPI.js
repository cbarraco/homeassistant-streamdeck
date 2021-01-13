// Prototype which represents a call service action property inspector
function CallServiceActionPI(inUUID, inActionInfo) {
    var instance = this;

    var settings = inActionInfo["payload"]["settings"];
    var action = inActionInfo["action"];
    var context = inActionInfo["context"];

    // Inherit from Action
    ActionPI.call(this, inUUID, inActionInfo);

    var actionSetUp = this.setUp;
    // Public function called on initial setup
    this.setUp = function () {
        actionSetUp.call(this);
        logMessage("Injecting call service parameters");
        const wrapper = document.getElementById("wrapper");
        wrapper.innerHTML += `
        <div class="sdpi-item">
            <div class="sdpi-item-label">Service</div>
            <select class="sdpi-item-value select" id="serviceId">
            </select>
        </div>
        <div type="textarea" class="sdpi-item"">
            <div class="sdpi-item-label">Payload</div>
            <span class="sdpi-item-value textarea">
                <textarea type="textarea" id="payload"></textarea>
            </span>
        </div>`;

        var serviceIdElement = document.getElementById("serviceId");
        serviceIdElement.value = settings.serviceId;
        serviceIdElement.addEventListener("input", function (inEvent) {
            var value = inEvent.target.value;
            settings.serviceId = value;
            saveSettings(action, inUUID, settings);
        });

        var payloadElement = document.getElementById("payload");
        if (settings.payload != undefined) {
            payloadElement.value = settings.payload;
        }
        payloadElement.addEventListener("input", function (inEvent) {
            var value = inEvent.target.value;
            settings.payload = value;
            saveSettings(action, inUUID, settings);
        });
    };
}
