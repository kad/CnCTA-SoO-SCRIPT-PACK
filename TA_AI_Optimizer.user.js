// ==UserScript==
// @name           TA AI Optimizer
// @description    Optimizes army formation using AI (Ollama)
// @namespace      https://*.alliances.commandandconquer.com/*/index.aspx*
// @match          https://*.alliances.commandandconquer.com/*/index.aspx*
// @version        1.0
// @author         Kad
// @grant          GM_xmlhttpRequest
// @connect        your-caddy-domain.com
// ==/UserScript==

(function () {
    var AI_Optimizer_Main = function () {
        function create_AI_Optimizer() {
            var TACS = null;
            try {
                if (typeof qx !== 'undefined' && qx.Class.getByName("TACS")) {
                    TACS = qx.Class.getByName("TACS").getInstance();
                }
            } catch (e) {}

            if (!TACS || !TACS.battleResultsBox) return;

            if (document.getElementById("ai-optimize-button")) return;

            var btn = new qx.ui.form.Button("AI Optimize").set({
                width: 100,
                height: 30,
                appearance: "button-text-small",
                toolTipText: "Optimize formation using AI"
            });
            btn.setDomId("ai-optimize-button");

            btn.addListener("click", function () {
                optimize_formation(TACS);
            }, this);

            // Add to TACS UI - find a good place
            // TACS.battleResultsBox is a window, it has a layout
            var children = TACS.battleResultsBox.getChildren();
            if (children.length > 0 && children[0] instanceof qx.ui.tabview.TabView) {
                var tabView = children[0];
                var pages = tabView.getChildren();
                // Add to the first page (usually Stats)
                if (pages.length > 0) {
                   pages[0].add(btn);
                }
            } else {
                TACS.battleResultsBox.add(btn);
            }
        }

        function optimize_formation(TACS) {
            console.log("AI Optimizer: Starting optimization...");
            
            var ownCity = ClientLib.Data.MainData.GetInstance().get_Cities().get_CurrentOwnCity();
            var targetCity = ClientLib.Data.MainData.GetInstance().get_Cities().get_CurrentCity();
            
            if (!ownCity || !targetCity) {
                alert("Please select a target city first.");
                return;
            }

            // Extract Army from TACS view
            var army = [];
            if (TACS.view.lastUnitList) {
                for (var i = 0; i < TACS.view.lastUnitList.length; i++) {
                    var unit = TACS.view.lastUnitList[i];
                    var unitObj = unit.get_UnitGameData_Obj();
                    army.push({
                        id: unit.get_Id(),
                        x: unit.get_CoordX(),
                        y: unit.get_CoordY(),
                        level: unit.get_CurrentLevel(),
                        name: unitObj ? unitObj.n : "Unknown",
                        enabled: unit.get_Enabled()
                    });
                }
            }

            // Extract Defense
            var defense = [];
            try {
                var defenseUnits = targetCity.get_CityUnitsData().get_DefenseUnits().get_Items();
                for (var id in defenseUnits) {
                    var unit = defenseUnits[id];
                    var unitObj = unit.get_UnitGameData_Obj();
                    defense.push({
                        x: unit.get_CoordX(),
                        y: unit.get_CoordY(),
                        level: unit.get_CurrentLevel(),
                        name: unitObj ? unitObj.n : "Unknown"
                    });
                }
            } catch (e) { console.error("Error extracting defense", e); }

            // Extract Buildings
            var buildings = [];
            try {
                var cityBuildings = targetCity.get_CityBuildingsData().get_Buildings().get_Items();
                for (var id in cityBuildings) {
                    var building = cityBuildings[id];
                    var buildingObj = building.get_UnitGameData_Obj();
                    buildings.push({
                        x: building.get_CoordX(),
                        y: building.get_CoordY(),
                        level: building.get_CurrentLevel(),
                        name: buildingObj ? buildingObj.n : "Unknown"
                    });
                }
            } catch (e) { console.error("Error extracting buildings", e); }

            var data = {
                army: army,
                defense: defense,
                buildings: buildings,
                stats: TACS.stats || {},
                metadata: {
                    faction: ownCity.get_CityFaction(),
                    targetFaction: targetCity.get_CityFaction(),
                    targetName: targetCity.get_Name()
                }
            };

            console.log("AI Optimizer: Sending data to backend...", data);
            
            // Note: In a real Userscript environment, GM_xmlhttpRequest is used.
            // Since this runs in the page context via the script injection, we might need to use fetch 
            // OR ensure GM_xmlhttpRequest is available if we use a proper userscript manager.
            // If injected via script tag, GM_ functions are NOT available.
            // I'll use fetch for now, but Caddy must allow CORS.
            
            fetch("https://your-caddy-domain.com/optimize", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(data)
            })
            .then(response => response.json())
            .then(result => {
                if (result.optimized_army) {
                    apply_optimized_army(TACS, result.optimized_army);
                }
            })
            .catch(error => {
                console.error("AI Optimizer: Fetch error", error);
            });
        }

        function apply_optimized_army(TACS, optimized_army) {
            console.log("AI Optimizer: Applying optimized army...", optimized_army);
            
            var formation = [];
            for (var i = 0; i < optimized_army.length; i++) {
                var unit = optimized_army[i];
                formation.push({
                    id: unit.id,
                    x: unit.x,
                    y: unit.y,
                    e: true
                });
            }
            
            TACS.loadFormation(formation);
            // Trigger a re-simulation if possible
            if (TACS.startSimulation) {
                TACS.startSimulation();
            }
        }

        setInterval(create_AI_Optimizer, 2000);
    };

    var script = document.createElement("script");
    script.textContent = "(" + AI_Optimizer_Main.toString() + ")();";
    document.getElementsByTagName("head")[0].appendChild(script);
})();
