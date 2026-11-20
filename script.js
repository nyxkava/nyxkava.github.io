/* ==========================================================================
   PROJECT STARFALL — GMOD LOADING SCREEN ENGINE
   Implements native Garry's Mod callbacks + Animated PCB/Starfall Canvas
   ========================================================================== */

(function () {
    "use strict";

    // DOM References
    var elServerName = document.getElementById("server-name");
    var elMap = document.getElementById("info-map");
    var elGamemode = document.getElementById("info-gamemode");
    var elMaxPlayers = document.getElementById("info-maxplayers");
    var elSteamId = document.getElementById("info-steamid");
    var elStatus = document.getElementById("status-text");
    var elTerminalStatus = document.getElementById("terminal-live-status");
    var elFilesCounter = document.getElementById("files-counter");
    var elProgressPercent = document.getElementById("progress-percent");
    var elProgressFill = document.getElementById("progress-fill");
    var elCurrentFile = document.getElementById("current-file");
    var elClock = document.getElementById("clock-display");
    var elTipText = document.getElementById("tip-text");
    var elTipCounter = document.getElementById("tip-counter");
    var elPreviewControls = document.getElementById("preview-controls");
    var btnReplay = document.getElementById("btn-replay");

    // Loading State
    var filesTotal = 0;
    var filesNeeded = 0;
    var gmodCallbackTriggered = false;

    // ----------------------------------------------------------------------
    // URL Query Parameters (?steamid=%s&mapname=%m)
    // ----------------------------------------------------------------------
    function getQueryParam(name) {
        var search = window.location.search.substring(1);
        if (!search) return null;
        var pairs = search.split("&");
        for (var i = 0; i < pairs.length; i++) {
            var kv = pairs[i].split("=");
            if (decodeURIComponent(kv[0]) === name) {
                return kv.length > 1 ? decodeURIComponent(kv[1].replace(/\+/g, " ")) : "";
            }
        }
        return null;
    }

    var initialSteamId = getQueryParam("steamid");
    var initialMap = getQueryParam("mapname");
    if (initialSteamId && initialSteamId !== "%s") {
        elSteamId.textContent = initialSteamId;
    }
    if (initialMap && initialMap !== "%m") {
        elMap.textContent = initialMap;
    }

    // ----------------------------------------------------------------------
    // UI Update Helpers
    // ----------------------------------------------------------------------
    function updateProgress(percent) {
        var clamped = Math.max(0, Math.min(100, Math.round(percent)));
        elProgressPercent.textContent = clamped + "%";
        elProgressFill.style.width = Math.max(3, clamped) + "%";
    }

    function updateFilesDisplay() {
        var downloaded = Math.max(0, filesTotal - filesNeeded);
        elFilesCounter.textContent = downloaded + " / " + filesTotal + " ARQUIVOS";
        if (filesTotal > 0) {
            var pct = (downloaded / filesTotal) * 100;
            updateProgress(pct);
        }
    }

    function setStatusMessage(msg) {
        elStatus.textContent = msg;
        if (elTerminalStatus) {
            elTerminalStatus.textContent = '"' + msg + '"';
        }
    }

    // Status translation / progress mapping for common GMod phases
    var statusProgressMap = {
        "Retrieving server info...": { text: "Obtendo informações do servidor...", pct: 12 },
        "Getting Addon Info...": { text: "Verificando coleção do Workshop...", pct: 24 },
        "Mounting Addons": { text: "Montando addons (StarfallEx, Wiremod, RVB)...", pct: 55 },
        "Workshop Complete": { text: "Addons do Workshop prontos!", pct: 68 },
        "Sending client info...": { text: "Enviando dados do cliente...", pct: 82 },
        "Starting Lua...": { text: "Inicializando ambiente Lua & StarfallEx...", pct: 92 },
        "Lua Started!": { text: "Ambiente Lua carregado! Entrando...", pct: 99 }
    };

    // ----------------------------------------------------------------------
    // GARRY'S MOD NATIVE JAVASCRIPT CALLBACKS
    // ----------------------------------------------------------------------
    window.GameDetails = function (servername, serverurl, mapname, maxplayers, steamid, gamemode, volume, language) {
        gmodCallbackTriggered = true;
        if (servername) elServerName.textContent = servername;
        if (mapname) elMap.textContent = mapname;
        if (gamemode) elGamemode.textContent = String(gamemode).toUpperCase();
        if (maxplayers) elMaxPlayers.textContent = maxplayers + " SLOTS";
        if (steamid) elSteamId.textContent = steamid;
    };

    window.SetFilesTotal = function (total) {
        gmodCallbackTriggered = true;
        filesTotal = parseInt(total, 10) || 0;
        updateFilesDisplay();
    };

    window.SetFilesNeeded = function (needed) {
        gmodCallbackTriggered = true;
        filesNeeded = parseInt(needed, 10) || 0;
        updateFilesDisplay();
    };

    window.DownloadingFile = function (fileName) {
        gmodCallbackTriggered = true;
        if (fileName) {
            elCurrentFile.textContent = "Baixando: " + fileName;
        }
    };

    window.SetStatusChanged = function (status) {
        gmodCallbackTriggered = true;
        if (!status) return;

        var mapped = statusProgressMap[status];
        if (mapped) {
            setStatusMessage(mapped.text);
            if (filesTotal === 0) {
                updateProgress(mapped.pct);
            }
        } else {
            setStatusMessage(status);
        }
    };

    // ----------------------------------------------------------------------
    // LIVE CLOCK
    // ----------------------------------------------------------------------
    function updateClock() {
        var now = new Date();
        var hh = String(now.getHours()).padStart(2, "0");
        var mm = String(now.getMinutes()).padStart(2, "0");
        var ss = String(now.getSeconds()).padStart(2, "0");
        elClock.textContent = hh + ":" + mm + ":" + ss;
    }
    updateClock();
    setInterval(updateClock, 1000);

    // ----------------------------------------------------------------------
    // ROTATING STARFALLEX TIPS
    // ----------------------------------------------------------------------
    var tips = [
        'Use <code>--@shared</code>, <code>--@server</code> ou <code>--@client</code> no topo do chip para controlar onde cada bloco Lua executa.',
        'Este servidor possui limites massivos de <code>Hologramas (1500)</code>, <code>CPU Quota (10x)</code> e <code>Props Customizados</code> para criações sem barreiras.',
        'Combine <code>render.createRenderTarget()</code> com telas Starfall para criar HUDs, radares, câmeras e jogos completos em 60 FPS.',
        'Precisa sincronizar cliente e servidor? Use a biblioteca <code>net</code> — nosso burst de rede foi expandido para streaming fluido.',
        'Use <code>prop.createCustom()</code> para gerar colisões físicas personalizadas a partir de vértices convexos diretamente via código.',
        'Salve suas máquinas, naves e sistemas completos com o <code>Advanced Duplicator 2</code> — até 16 MB de userdata por chip!'
    ];

    var tipIndex = 0;
    function cycleTip() {
        tipIndex = (tipIndex + 1) % tips.length;
        elTipText.style.opacity = "0";
        setTimeout(function () {
            elTipText.innerHTML = tips[tipIndex];
            elTipCounter.textContent = "0" + (tipIndex + 1) + " / 0" + tips.length;
            elTipText.style.opacity = "1";
        }, 320);
    }
    setInterval(cycleTip, 6500);

    // ----------------------------------------------------------------------
    // ANIMATED PCB CIRCUIT TRACES + STARFIELD CANVAS
    // ----------------------------------------------------------------------
    var canvas = document.getElementById("pcb-canvas");
    var ctx = canvas.getContext("2d");
    var width = 0;
    var height = 0;
    var stars = [];
    var circuits = [];

    function resizeCanvas() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
        buildScene();
    }

    function buildScene() {
        stars = [];
        var starCount = Math.floor((width * height) / 16000);
        for (var i = 0; i < starCount; i++) {
            stars.push({
                x: Math.random() * width,
                y: Math.random() * height,
                r: Math.random() * 1.6 + 0.4,
                alpha: Math.random() * 0.6 + 0.15,
                speedY: Math.random() * 0.18 + 0.04,
                twinkle: Math.random() * Math.PI * 2
            });
        }

        // Generate diagonal & orthogonal PCB circuit traces inspired by Reference 1
        circuits = [];
        var traceCount = 26;
        for (var c = 0; c < traceCount; c++) {
            var startX = Math.random() * width;
            var startY = Math.random() * height;
            var points = [{ x: startX, y: startY }];
            var cx = startX;
            var cy = startY;
            var segs = 3 + Math.floor(Math.random() * 4);
            var angles = [0, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4, Math.PI, -Math.PI / 4, -Math.PI / 2];

            for (var s = 0; s < segs; s++) {
                var ang = angles[Math.floor(Math.random() * angles.length)];
                var len = 55 + Math.random() * 140;
                cx += Math.cos(ang) * len;
                cy += Math.sin(ang) * len;
                points.push({ x: cx, y: cy });
            }

            circuits.push({
                points: points,
                pulsePos: Math.random(),
                pulseSpeed: 0.002 + Math.random() * 0.004,
                isTaupe: Math.random() < 0.22
            });
        }
    }

    function drawFrame() {
        ctx.clearRect(0, 0, width, height);

        // Subtle diagonal perspective grid
        ctx.strokeStyle = "rgba(34, 139, 230, 0.045)";
        ctx.lineWidth = 1;
        var gridStep = 72;
        ctx.beginPath();
        for (var gx = 0; gx < width; gx += gridStep) {
            ctx.moveTo(gx, 0);
            ctx.lineTo(gx, height);
        }
        for (var gy = 0; gy < height; gy += gridStep) {
            ctx.moveTo(0, gy);
            ctx.lineTo(width, gy);
        }
        ctx.stroke();

        // Draw PCB Traces & Traveling Pulses
        for (var i = 0; i < circuits.length; i++) {
            var tr = circuits[i];
            var pts = tr.points;

            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);
            for (var p = 1; p < pts.length; p++) {
                ctx.lineTo(pts[p].x, pts[p].y);
            }
            ctx.strokeStyle = tr.isTaupe
                ? "rgba(128, 122, 109, 0.16)"
                : "rgba(45, 91, 150, 0.26)";
            ctx.lineWidth = 1.4;
            ctx.stroke();

            // Endpoints (PCB Pads)
            var last = pts[pts.length - 1];
            ctx.beginPath();
            ctx.arc(last.x, last.y, 3.2, 0, Math.PI * 2);
            ctx.strokeStyle = tr.isTaupe
                ? "rgba(168, 161, 147, 0.28)"
                : "rgba(56, 189, 248, 0.35)";
            ctx.stroke();

            // Traveling energy pulse
            tr.pulsePos += tr.pulseSpeed;
            if (tr.pulsePos > 1) tr.pulsePos = 0;

            var totalSegs = pts.length - 1;
            var scaled = tr.pulsePos * totalSegs;
            var segIdx = Math.min(totalSegs - 1, Math.floor(scaled));
            var segT = scaled - segIdx;
            var pA = pts[segIdx];
            var pB = pts[segIdx + 1];
            var px = pA.x + (pB.x - pA.x) * segT;
            var py = pA.y + (pB.y - pA.y) * segT;

            ctx.beginPath();
            ctx.arc(px, py, 2.4, 0, Math.PI * 2);
            ctx.fillStyle = tr.isTaupe ? "rgba(168, 161, 147, 0.75)" : "rgba(56, 189, 248, 0.9)";
            ctx.shadowColor = tr.isTaupe ? "#a8a193" : "#38bdf8";
            ctx.shadowBlur = 10;
            ctx.fill();
            ctx.shadowBlur = 0;
        }

        // Draw Falling Starfield Particles
        for (var s = 0; s < stars.length; s++) {
            var st = stars[s];
            st.y += st.speedY;
            st.twinkle += 0.02;
            if (st.y > height + 4) {
                st.y = -4;
                st.x = Math.random() * width;
            }
            var a = st.alpha * (0.65 + 0.35 * Math.sin(st.twinkle));
            ctx.beginPath();
            ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(186, 230, 253, " + a.toFixed(3) + ")";
            ctx.fill();
        }

        window.requestAnimationFrame(drawFrame);
    }

    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();
    window.requestAnimationFrame(drawFrame);

    // ----------------------------------------------------------------------
    // BROWSER PREVIEW DEMO MODE (only activates if outside Garry's Mod)
    // ----------------------------------------------------------------------
    var simTimers = [];
    function runPreviewSimulation() {
        for (var i = 0; i < simTimers.length; i++) {
            clearTimeout(simTimers[i]);
        }
        simTimers = [];

        filesTotal = 42;
        filesNeeded = 42;
        elServerName.textContent = "PROJECT STARFALL [TEST]";
        elMap.textContent = "gm_flatgrass";
        elGamemode.textContent = "SANDBOX";
        elMaxPlayers.textContent = "128 SLOTS";
        elSteamId.textContent = "76561198000000000";

        var steps = [
            { t: 200, status: "Retrieving server info...", file: "Conectando ao servidor BR [SA]...", needed: 42 },
            { t: 1100, status: "Getting Addon Info...", file: "Workshop Collection #3838186200 (20 addons)", needed: 38 },
            { t: 2100, status: "Baixando módulos StarfallEx...", file: "lua/starfall/libs_sh/holograms.lua", needed: 30 },
            { t: 3100, status: "Baixando módulos StarfallEx...", file: "lua/starfall/libs_cl/render.lua", needed: 21 },
            { t: 4100, status: "Mounting Addons", file: "addons/starfallex_git_master.gma", needed: 11 },
            { t: 5200, status: "Sending client info...", file: "addons/wiremod.gma", needed: 4 },
            { t: 6200, status: "Starting Lua...", file: "lua/autorun/starfall_init.lua", needed: 1 },
            { t: 7300, status: "Lua Started!", file: "Pronto! Entrando em gm_flatgrass...", needed: 0 }
        ];

        for (var s = 0; s < steps.length; s++) {
            (function (step) {
                simTimers.push(setTimeout(function () {
                    filesNeeded = step.needed;
                    updateFilesDisplay();
                    elCurrentFile.textContent = step.file;
                    var mapped = statusProgressMap[step.status];
                    setStatusMessage(mapped ? mapped.text : step.status);
                }, step.t));
            })(steps[s]);
        }
    }

    if (btnReplay) {
        btnReplay.addEventListener("click", runPreviewSimulation);
    }

    // If GMod hasn't called any callback within 1.4s, assume user opened in browser
    setTimeout(function () {
        if (!gmodCallbackTriggered) {
            if (elPreviewControls) {
                elPreviewControls.style.display = "flex";
            }
            runPreviewSimulation();
        }
    }, 1400);
})();
