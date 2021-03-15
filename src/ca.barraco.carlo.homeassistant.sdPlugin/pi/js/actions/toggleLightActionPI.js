// Prototype which represents a toggle light action property inspector
function ToggleLightActionPI(inUUID, inActionInfo) {
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
        logMessage("Injecting toggle light parameters");
        const wrapper = document.getElementById("wrapper");
        wrapper.innerHTML += `
        <div class="sdpi-item">
            <div class="sdpi-item-label">Entity</div>
            <select class="sdpi-item-value select" id="entityId">
            </select>
        </div>`;

        var entityIdElement = document.getElementById("entityId");
        entityIdElement.value = settings.entityId;
        entityIdElement.addEventListener("input", function (inEvent) {
            var value = inEvent.target.value;
            settings.entityId = value;
            saveSettings(action, inUUID, settings);
        });
    };
}
