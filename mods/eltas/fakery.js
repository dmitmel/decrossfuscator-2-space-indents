/*
 * decrossfuscator - A project to undo the effects of a specific version of Google Closure Compiler for a specific game by mapping between versions.
 * Written starting in 2017 by contributors (see CREDITS.txt)
 * To the extent possible under law, the author(s) have dedicated all copyright and related and neighboring rights to this software to the public domain worldwide. This software is distributed without any warranty.
 * You should have received a copy of the CC0 Public Domain Dedication along with this software. If not, see <http://creativecommons.org/publicdomain/zero/1.0/>.
 */

// Ensures game always runs at precisely 60FPS.
ig.Timer["emileatasLocked"] = false;
ig.Timer.step = function () {
 if (ig.Timer["emileatasLocked"])
  return;
 var stepVal = 1 / 60.0;
 ig.Timer["emileatasLast"] = ig.Timer.time;
 ig.Timer.time += stepVal * ig.Timer.timeScale;
};

// Needed for determinism.
//Math["randomValue"] = 0;
// function rnd() rv = ((rv + 0.1) * 13.9241512) rv = rv - math.floor(rv) return rv end
//Math.random = function () {
// Math["randomValue"] += 0.1;
// Math["randomValue"] *= 13.9241512;
// Math["randomValue"] -= Math.floor(Math["randomValue"]);
// return Math["randomValue"];
//};
// Backup strategy, because sound stuff likes to play with the RNG true randomness seems to work
Math.random = function () {
 return 0.5;
};

Date["simulated"] = 0;
Date.now = function () {
 return Date["simulated"];
};

ig.Timer["emileatasCheckpoint"] = function () {
 console.log("-- TAS Checkpoint --");
 ig.system.clock.reset();
 ig.system.actualTick = 0;
 ig.cleanCache();
 Math["randomValue"] = 0;
 // Camera is used for some triggers (has effect on gameplay).
 // Try to wipe it completely clean if this would not affect gameplay
 if (sc.model.isTitle()) {
  ig.camera.targets = [];
  ig.camera.namedTargets = {};
  ig.camera._currentPos = Vec2.create();
  ig.camera._currentZ = 0;
  ig.camera._currentZoom = 1;
  ig.camera._currentZoomPos = Vec2.create();
  ig.camera._zSlow = false;
  ig.camera._lastPos = Vec2.create();
  ig.camera._lastZoom = 1;
  ig.camera._lastZoomPos = Vec2.create();
  ig.camera._duration = 0;
  ig.camera._time = 0;
  ig.camera._transitionFunction = null;
  ig.camera._cameraInBounds = false;
 }
};

/*
 * It is important to note here the Cubic Impact input model.
 * Having any activity involving a key makes state("that key") return true.
 * This includes, of course, that key being held.
 * But it also includes the frame of a keyup.
 * Thus, the state list is:
 *
 * 1: Incoming. DS
 * 2: Held.      S
 * 3: Outgoing.  SU
 * 4: Perfect.  DSU
 *
 * Getting the special keyup behavior of 3 or 4 wrong will cause charged shots to simply fail to work.
 * This is because Crosshair.isThrowCharged checks that the character controller is aiming.
 * This in turn involves a call to check the input state.
 * Since if you got this wrong the input state of a released button would be false, things break.
 * -- someone who got this wrong
 * 
 * Example mock:
 *
 * {
 *  state: {jump: (1/2/3/4)},
 *  mouseX: 0,
 *  mouseY: 0
 * }
 *
 */

// This does the input filtering.
ig.Input.inject({
 "emileatasMockDetails": null,
 "emileatasOldX": null,
 "emileatasOldY": null,
 "emileatasAccept": function (m) {
  if (m != null) {
   this.currentDevice = ig.INPUT_DEVICES.KEYBOARD_AND_MOUSE;
   this.mouse.x = m["mouseX"];
   this.mouse.y = m["mouseY"];
   if (this["emileatasMockDetails"] == null) {
    this["emileatasOldX"] = this.mouse.x;
    this["emileatasOldY"] = this.mouse.y;
   }
   this.mouseGuiActive = true;
  } else if (this["emileatasMockDetails"] != null) {
   this.mouse.x = this["emileatasOldX"];
   this.mouse.y = this["emileatasOldY"];
  }
  this["emileatasMockDetails"] = m;
 },
 pressed: function (a) {
  var m = this["emileatasMockDetails"];
  if (m != null) {
   if (m["state"][a])
    return (m["state"][a] == 1) || (m["state"][a] == 4);
   return false;
  }
  return this.parent(a);
 },
 keyupd: function (a) {
  var m = this["emileatasMockDetails"];
  if (m != null) {
   if (m["state"][a])
    return (m["state"][a] == 3) || (m["state"][a] == 4);
   return false;
  }
  return this.parent(a);
 },
 state: function (a) {
  var m = this["emileatasMockDetails"];
  if (m != null) {
   if (m["state"][a])
    return true;
   return false;
  }
  return this.parent(a);
 }
});
// Effectively disable gamepad support.
ig.Html5GamepadHandler.inject({
 update: function (c) {
 }
});

ig.System.inject({
 "emileatasTasks": [],
 "emileatasSuperspeed": 1,
 "emileatasRunningTask": false,
 // Also holds actual parent run
 "emileatasStartedRun": null,
 init: function (a, b, c, j, k, l) {
  this.parent(a, b, c, j, k, l);
  // Extra backup safety.
  this.clock.tick = function () {
   if (ig.Timer["emileatasLocked"])
    return 0;
   return 1 / 60;
  };
 },
 setWindowFocus: function (focusLost) {
  // Do nothing, this functionality can break things
 },
 "emileatasRunCore": function () {
  if (ig.system["emileatasTasks"].length > 0) {
   // Tasks to run, stay in holding pattern.
   if (!ig.system["emileatasRunningTask"]) {
    ig.system["emileatasRunningTask"] = true;
    ig.system["emileatasTasks"].shift()();
   }
   return;
  }
  if (ig.loading || ig.system["emileatasRunningTask"]) {
   return;
  }
  if (sc.model.isLoading()) {
   ig.Timer["emileatasLocked"] = true;
   this["emileatasStartedRun"]();
   ig.Timer["emileatasLocked"] = false;
   return;
  }
  var tascore = window["mods"]["eltas"]["tascore"];
  if (!tascore)
   tascore = window["mods"]["eltas"]["tascore"] = new window["mods"]["eltas"]["TASCore"]();
  var mock = tascore["preRun"]();
  if (mock != null) {
   ig.input["emileatasAccept"](mock);
   this["emileatasStartedRun"]();
   ig.input["emileatasAccept"](null);
  } else {
   ig.input.clearPressed();
  }
  tascore["postRun"]();
 },
 "emileatasTrueRun": function () {
  try {
   for (var i = 0; i < this["emileatasSuperspeed"]; i++)
    this["emileatasRunCore"]();
  } catch (b) {
   ig.system.error(b);
  }
  window.requestAnimationFrame(ig.system["emileatasTrueRun"].bind(ig.system), ig.system.canvas);
 },
 run: function () {
  if (this["emileatasStartedRun"])
   return;
  this["emileatasStartedRun"] = this.parent.bind(this);
  this["emileatasTrueRun"]();
 }
});

(function () {
 function loadCommon(a) {
  // The task ensures that even zero-frame loads count as one-frame.
  // Only one task can run at a time, so load submission order is used to aid determinism.
  // As no frames occur during the load,
  //  all loads are thus one-frame from game perspective.
  var cLoad = this.parent.bind(this);
  var cb = function () {
   //console.log("Did load.");
   cLoad(function (b, c, d) {
    //console.log("Did load end.");
    ig.system["emileatasRunningTask"] = false;
    a && a(b, c, d);
   });
  };
  if ((!ig.system) || (!ig.system.running)) {
   // Game not using run()
   cb();
  } else {
   ig.system["emileatasTasks"].push(cb);
  }
 }
 ig.Loadable.inject({
  load: loadCommon
 });
 ig.SingleLoadable.inject({
  load: loadCommon
 });
})();
