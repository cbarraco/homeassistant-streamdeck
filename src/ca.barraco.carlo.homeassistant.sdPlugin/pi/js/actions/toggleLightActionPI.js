// Prototype which represents a toggle light action property inspector
function ToggleLightActionPI(uuid, actionInfo) {
    var instance = this;

    var settings = actionInfo["payload"]["settings"];
    var action = actionInfo["action"];
    var context = actionInfo["context"];

    // Inherit from Action
    ActionPI.call(this, uuid, actionInfo);

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
            saveSettings(action, uuid, settings);
        });
    };

    this.update = function(homeAssistantCache){
        var entityIdElement = document.getElementById("entityId");
        ActionPI.populateEntityOptions(entityIdElement, "light", homeAssistantCache);
        if (settings.entityId != undefined) {
            entityIdElement.value = settings.entityId;
        }
    };
}
