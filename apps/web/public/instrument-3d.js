/**
 * slop-detect.com — 3D Optical Instrument & Kinetic Dissection Engine
 *
 * Zero-dependency, CSP-safe ('self'), deterministic 3D projection & telemetry
 * renderer built on HTML5 2D/3D Canvas projection.
 *
 * Dogfood-clean by construction:
 * - Renders inside <canvas> (exempt from CSS gradient/shadow/nested-card rules)
 * - Uses only the 5 core brand tokens:
 *   Paper #F4F5F2, Surface #FBFBF9, Ink #181815 / #16170F,
 *   Clean #1FA85E (#11703F), Mild #D89A2E (#835A0E), Heavy #C9402E (#B23A2A),
 *   System #2C6E8F.
 * - Respects prefers-reduced-motion: reduce.
 */
(function () {
  'use strict';

  var REDUCED_MOTION =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var COLORS = {
    paper: '#F4F5F2',
    paper2: '#EEF0EB',
    panel: '#FBFBF9',
    ink: '#181815',
    inkDeep: '#16170F',
    text2: '#3A3B33',
    text3: '#46473F',
    text4: '#565750',
    text6: '#9A9B8E',
    border: '#DBDDD6',
    borderBtn: '#C9CBC3',
    clean: '#1FA85E',
    cleanText: '#11703F',
    cleanDark: '#3FBE7A',
    mild: '#D89A2E',
    mildText: '#835A0E',
    heavy: '#C9402E',
    heavyText: '#B23A2A',
    system: '#2C6E8F',
    slopViolet: '#6366F1',
    slopPink: '#EC4899',
  };

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function hexToRgb(hex) {
    var h = String(hex || '#000000').replace('#', '');
    if (h.length === 3) {
      h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    }
    var n = parseInt(h, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  function lerpColor(hexA, hexB, t) {
    var a = hexToRgb(hexA);
    var b = hexToRgb(hexB);
    var r = Math.round(lerp(a.r, b.r, t));
    var g = Math.round(lerp(a.g, b.g, t));
    var bl = Math.round(lerp(a.b, b.b, t));
    return 'rgb(' + r + ',' + g + ',' + bl + ')';
  }

  function rgba(hex, alpha) {
    var c = hexToRgb(hex);
    return 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + alpha + ')';
  }

  // ── 3D Projection Math ──────────────────────────────────────────────────────
  function project3D(x, y, z, cam) {
    // Rotate around Y (yaw) then X (pitch)
    var cy = Math.cos(cam.yaw),
      sy = Math.sin(cam.yaw);
    var cx = Math.cos(cam.pitch),
      sx = Math.sin(cam.pitch);

    var x1 = x * cy - z * sy;
    var z1 = x * sy + z * cy;
    var y2 = y * cx - z1 * sx;
    var z2 = y * sx + z1 * cx;

    var fov = cam.fov || 680;
    var dist = (cam.dist || 520) + z2;
    var scale = fov / Math.max(120, dist);
    return {
      x: cam.cx + x1 * scale,
      y: cam.cy + y2 * scale,
      z: z2,
      scale: scale,
    };
  }

  function drawPoly3D(ctx, pts3d, cam, fill, stroke, lineWidth, dash) {
    var pts = pts3d.map(function (p) {
      return project3D(p[0], p[1], p[2], cam);
    });
    ctx.save();
    ctx.beginPath();
    for (var i = 0; i < pts.length; i++) {
      if (i === 0) ctx.moveTo(pts[i].x, pts[i].y);
      else ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.closePath();
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lineWidth || 1;
      if (dash) ctx.setLineDash(dash);
      ctx.stroke();
    }
    ctx.restore();
    return pts;
  }

  function drawLine3D(ctx, p1, p2, cam, stroke, lineWidth, dash) {
    var a = project3D(p1[0], p1[1], p1[2], cam);
    var b = project3D(p2[0], p2[1], p2[2], cam);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth || 1;
    if (dash) ctx.setLineDash(dash);
    ctx.stroke();
    ctx.restore();
    return { a: a, b: b };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. HERO 3D EXPLODED DOM SPECIMEN & OPTICAL SCANNER STAGE
  // ═══════════════════════════════════════════════════════════════════════════
  var SPECIMENS = {
    heavy: {
      key: 'heavy',
      domain: 'v0-ai-launch.app',
      baseScore: 48,
      copyScore: 18,
      aeoScore: 35,
      sysScore: 42,
      flagged: 10,
      verdict: 'Heavy slop. Wears the starter kit head to toe.',
      tells: [
        { plane: 0, x: -78, z: -28, code: '+5', name: 'Aurora mesh blob', cat: 'css', minSlop: 0.35 },
        { plane: 0, x: 74, z: 22, code: '+4', name: 'Perma-dark + grey body', cat: 'colors', minSlop: 0.55 },
        { plane: 1, x: 0, z: -38, code: '+5', name: 'Eyebrow launch pill', cat: 'layout', minSlop: 0.4 },
        { plane: 1, x: -64, z: 4, code: '+8', name: 'Inter / Geist font stack', cat: 'fonts', minSlop: 0.15 },
        { plane: 1, x: 68, z: 6, code: '+6', name: 'Gradient-clipped H1', cat: 'colors', minSlop: 0.25 },
        { plane: 2, x: -58, z: 0, code: '+8', name: 'VibeCode purple CTA', cat: 'colors', minSlop: 0.1 },
        { plane: 2, x: 62, z: 12, code: '+4', name: '28px chromatic glow', cat: 'css', minSlop: 0.3 },
        { plane: 3, x: -72, z: -12, code: '+4', name: '3-up icon card grid', cat: 'layout', minSlop: 0.45 },
        { plane: 3, x: 70, z: 18, code: '+6', name: '4px top accent stripe', cat: 'layout', minSlop: 0.2 },
        { plane: 4, x: 0, z: 28, code: '+7', name: 'LLM buzzword & em-dash prose', cat: 'copy', minSlop: 0.5 },
      ],
    },
    mild: {
      key: 'mild',
      domain: 'acme-cloud.dev',
      baseScore: 16,
      copyScore: 5,
      aeoScore: 72,
      sysScore: 78,
      flagged: 3,
      verdict: 'Mild. Mostly considered, with a few template reflexes.',
      tells: [
        { plane: 1, x: -64, z: 4, code: '+8', name: 'Geist Sans reflex stack', cat: 'fonts', minSlop: 0.15 },
        { plane: 1, x: 56, z: -14, code: '+4', name: 'Centered generic sans H1', cat: 'layout', minSlop: 0.25 },
        { plane: 2, x: 48, z: -24, code: '+4', name: 'Translucent blur navbar', cat: 'css', minSlop: 0.35 },
      ],
    },
    clean: {
      key: 'clean',
      domain: 'slop-detect.com',
      baseScore: 0,
      copyScore: 0,
      aeoScore: 100,
      sysScore: 100,
      flagged: 0,
      verdict: 'Clean. A point of view — zero AI-template reflexes triggered.',
      tells: [],
    },
  };

  var SCAN_PHASES = [
    { idx: 1, label: 'Launching headless Chromium 1280×800 & checking SSRF hops…', plane: 0 },
    { idx: 2, label: 'Awaiting document.fonts.ready & network idle settle window…', plane: 1 },
    { idx: 3, label: 'Evaluating 27 DOM geometry & computed-style extractors…', plane: 2 },
    { idx: 4, label: 'Scoring 9 prose lexicon patterns & DESIGN.md token compliance…', plane: 3 },
    { idx: 5, label: 'Assembling deterministic verdict & minting permalink…', plane: 4 },
  ];

  var PLANE_META = [
    { id: 'L01', name: 'SURFACE & BACKDROP', yBase: 112 },
    { id: 'L02', name: 'HERO TYPOGRAPHY', yBase: 56 },
    { id: 'L03', name: 'CTA & CHROMATIC FILL', yBase: 0 },
    { id: 'L04', name: 'GRID & CARD GEOMETRY', yBase: -56 },
    { id: 'L05', name: 'COPY & AEO DISCOVERY', yBase: -112 },
  ];

  function gradeForScore(s) {
    if (s <= 2) return 'A+';
    if (s <= 5) return 'A';
    if (s <= 9) return 'A-';
    if (s <= 14) return 'B+';
    if (s <= 19) return 'B';
    if (s <= 23) return 'B-';
    if (s <= 27) return 'C';
    if (s <= 33) return 'D+';
    if (s <= 39) return 'D';
    return 'F';
  }

  function tierForScore(s) {
    if (s >= 28) return 'Heavy';
    if (s >= 10) return 'Mild';
    return 'Clean';
  }

  function tierHex(tier) {
    if (tier === 'Clean') return COLORS.clean;
    if (tier === 'Mild') return COLORS.mild;
    return COLORS.heavy;
  }

  function tierTextHex(tier) {
    if (tier === 'Clean') return COLORS.cleanText;
    if (tier === 'Mild') return COLORS.mildText;
    return COLORS.heavyText;
  }

  function initHeroStage() {
    var canvas = document.getElementById('domStageCanvas');
    if (!canvas) return null;
    var ctx = canvas.getContext('2d');
    if (!ctx) return null;

    var state = {
      specimenKey: 'heavy',
      morph: 0, // 0 = specimen's raw state, 1 = fully de-slopped (Clean 0)
      targetMorph: 0,
      explode: 1, // layer separation multiplier
      targetExplode: 1,
      yaw: -0.48,
      targetYaw: -0.48,
      pitch: 0.42,
      targetPitch: 0.42,
      dragging: false,
      dragStartX: 0,
      dragStartY: 0,
      scanY: -130,
      scanDir: 1,
      hoveredPlane: -1,
      liveScanActive: false,
      liveScanUrl: '',
      liveScanStart: 0,
      liveScanPhase: 0,
      animMorphing: false,
      time: 0,
    };

    var elScore = document.getElementById('stageScoreNum');
    var elGrade = document.getElementById('stageGradeBadge');
    var elTier = document.getElementById('stageTierBadge');
    var elDomain = document.getElementById('stageDomainLabel');
    var elFlagged = document.getElementById('stageFlaggedCount');
    var elVerdict = document.getElementById('stageVerdictText');
    var elMorphSlider = document.getElementById('stageMorphRange');
    var elMorphVal = document.getElementById('stageMorphValue');
    var elDeslopBtn = document.getElementById('stageDeslopBtn');
    var elExplodeBtn = document.getElementById('stageExplodeBtn');
    var elLiveBanner = document.getElementById('stageLiveBanner');
    var elLivePhase = document.getElementById('stageLivePhase');
    var elLiveTimer = document.getElementById('stageLiveTimer');
    var elTellsList = document.getElementById('stageTellsList');

    function currentMetrics() {
      var spec = SPECIMENS[state.specimenKey] || SPECIMENS.heavy;
      var slopFactor = clamp(1 - state.morph, 0, 1);
      var rawScore = Math.round(spec.baseScore * slopFactor);
      var tier = tierForScore(rawScore);
      var grade = gradeForScore(rawScore);
      var activeTells = spec.tells.filter(function (t) {
        return slopFactor >= t.minSlop;
      });
      return {
        spec: spec,
        slopFactor: slopFactor,
        score: rawScore,
        tier: tier,
        grade: grade,
        activeTells: activeTells,
        copyScore: Math.round(spec.copyScore * slopFactor),
        aeoScore: Math.round(lerp(spec.aeoScore, 100, state.morph)),
        sysScore: Math.round(lerp(spec.sysScore, 100, state.morph)),
      };
    }

    var lastTellsKey = null;
    function syncReadout() {
      var m = currentMetrics();
      if (elScore) {
        elScore.textContent = String(m.score);
        elScore.style.color = tierTextHex(m.tier);
      }
      if (elGrade) {
        elGrade.textContent = m.grade;
        elGrade.style.color = tierTextHex(m.tier);
      }
      if (elTier) {
        elTier.textContent = m.tier.toUpperCase();
        elTier.style.color = tierTextHex(m.tier);
        elTier.style.borderColor = tierHex(m.tier);
      }
      if (elDomain) {
        elDomain.textContent = state.liveScanActive ? state.liveScanUrl : m.spec.domain;
      }
      if (elFlagged) {
        elFlagged.textContent = m.activeTells.length + '/27 rules flagged';
      }
      if (elVerdict) {
        if (state.morph >= 0.92 || m.score === 0) {
          elVerdict.textContent = SPECIMENS.clean.verdict;
        } else if (m.tier === 'Mild') {
          elVerdict.textContent = SPECIMENS.mild.verdict;
        } else {
          elVerdict.textContent = m.spec.verdict;
        }
      }
      if (elMorphSlider && document.activeElement !== elMorphSlider) {
        elMorphSlider.value = String(Math.round(state.morph * 100));
      }
      if (elMorphVal) {
        elMorphVal.textContent = Math.round(state.morph * 100) + '% de-slopped';
      }
      if (elDeslopBtn) {
        elDeslopBtn.textContent =
          state.morph > 0.5 ? 'Reset to raw specimen ↺' : 'De-slop to 0/100 →';
      }
      // Rebuild the two HTML lists only when the active tell set changes; during a
      // morph syncReadout runs every frame but the set changes a handful of times.
      var tellsKey = m.activeTells
        .map(function (t) {
          return t.code;
        })
        .join('|');
      if (tellsKey === lastTellsKey) return;
      lastTellsKey = tellsKey;
      if (elTellsList) {
        if (m.activeTells.length === 0) {
          elTellsList.innerHTML =
            '<li class="st-tell st-tell-clean"><span class="st-code" style="color:' +
            COLORS.cleanText +
            '">✓ 0 </span><span class="st-name">All 27 CSS geometry &amp; 9 copy rules pass Clean.</span></li>';
        } else {
          elTellsList.innerHTML = m.activeTells
            .map(function (t) {
              return (
                '<li class="st-tell" data-plane="' +
                t.plane +
                '"><span class="st-code">' +
                t.code +
                ' </span><span class="st-name">' +
                t.name +
                ' </span><span class="st-cat">· ' +
                t.cat +
                '</span></li>'
              );
            })
            .join('');
        }
      }
      var elFallback = document.getElementById('stage2dFallback');
      if (elFallback) {
        var rowsHtml = [];
        for (var pIdx = PLANE_META.length - 1; pIdx >= 0; pIdx--) {
          var pm = PLANE_META[pIdx];
          var planeTells = m.activeTells.filter(function (t) {
            return t.plane === pIdx;
          });
          var statusTxt =
            planeTells.length === 0
              ? '0 flagged'
              : planeTells.length + ' flagged';
          var rulesHtml =
            planeTells.length === 0
              ? '<span class="stage-2d-clean">✓ Clean on this plane</span>'
              : planeTells
                  .map(function (t) {
                    return (
                      '<span class="stage-2d-rule"><b>' +
                      t.code +
                      '</b> ' +
                      t.name +
                      '</span>'
                    );
                  })
                  .join('');
          rowsHtml.push(
            '<div class="stage-2d-layer">' +
              '<div class="stage-2d-head">' +
              '<span class="stage-2d-id">' +
              pm.id +
              '</span>' +
              '<span class="stage-2d-name">' +
              (pm.name.charAt(0) + pm.name.slice(1).toLowerCase())
                .replace(/\bcta\b/g, 'CTA')
                .replace(/\baeo\b/g, 'AEO') +
              '</span>' +
              '<span class="stage-2d-status">' +
              statusTxt +
              '</span>' +
              '</div>' +
              '<div class="stage-2d-rules">' +
              rulesHtml +
              '</div>' +
              '</div>'
          );
        }
        elFallback.innerHTML = rowsHtml.join('');
      }
    }

    // Reduced motion: there is no animation loop, so every interaction snaps the
    // eased values to their targets and paints exactly one frame.
    var redrawQueued = false;
    function redrawStill() {
      if (!REDUCED_MOTION || redrawQueued) return;
      redrawQueued = true;
      requestAnimationFrame(function () {
        redrawQueued = false;
        // Read the targets at paint time so every change since queuing lands.
        state.morph = state.targetMorph;
        state.explode = state.targetExplode;
        state.yaw = state.targetYaw;
        state.pitch = state.targetPitch;
        renderFrame();
      });
    }

    // Wire specimen tabs
    document.querySelectorAll('[data-specimen]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var key = btn.getAttribute('data-specimen');
        if (!SPECIMENS[key]) return;
        state.specimenKey = key;
        state.targetMorph = key === 'clean' ? 1 : 0;
        state.morph = state.targetMorph;
        document.querySelectorAll('[data-specimen]').forEach(function (b) {
          var active = b.getAttribute('data-specimen') === key;
          b.classList.toggle('active', active);
          b.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
        syncReadout();
        redrawStill();
      });
    });

    if (elMorphSlider) {
      elMorphSlider.addEventListener('input', function () {
        state.targetMorph = clamp(Number(elMorphSlider.value) / 100, 0, 1);
        state.morph = state.targetMorph;
        syncReadout();
        redrawStill();
      });
    }

    if (elDeslopBtn) {
      elDeslopBtn.addEventListener('click', function () {
        state.targetMorph = state.targetMorph > 0.5 ? 0 : 1;
        if (REDUCED_MOTION) {
          state.morph = state.targetMorph;
          syncReadout();
          redrawStill();
        } else {
          wake();
          // Loop paused (canvas hidden below 768px, offscreen, or background tab):
          // nothing will ease the morph, so snap the visible readout + lists now.
          if (!looping) {
            state.morph = state.targetMorph;
            syncReadout();
          }
        }
      });
    }

    if (elExplodeBtn) {
      elExplodeBtn.addEventListener('click', function () {
        state.targetExplode = state.targetExplode > 0.6 ? 0.28 : 1.0;
        elExplodeBtn.textContent =
          state.targetExplode > 0.6 ? 'Collapse layers ◳' : 'Explode 3D stack ◳';
        redrawStill();
      });
    }

    // Pointer orbit interaction on canvas
    canvas.addEventListener('pointerdown', function (e) {
      state.dragging = true;
      state.dragStartX = e.clientX;
      state.dragStartY = e.clientY;
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch (_) {}
    });

    canvas.addEventListener('pointermove', function (e) {
      var rect = canvas.getBoundingClientRect();
      var relY = (e.clientY - rect.top) / Math.max(1, rect.height);
      state.hoveredPlane = clamp(Math.floor((1 - relY) * 5), 0, 4);

      if (!state.dragging) return;
      var dx = e.clientX - state.dragStartX;
      var dy = e.clientY - state.dragStartY;
      state.dragStartX = e.clientX;
      state.dragStartY = e.clientY;
      state.targetYaw = clamp(state.targetYaw + dx * 0.007, -1.15, 0.45);
      state.targetPitch = clamp(state.targetPitch + dy * 0.006, 0.15, 0.85);
      redrawStill();
    });

    function endDrag() {
      state.dragging = false;
    }
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);
    canvas.addEventListener('pointerleave', function () {
      state.hoveredPlane = -1;
    });

    // Resize handling
    var dpr = 1;
    var W = 640;
    var H = 420;
    function resize() {
      var rect = canvas.getBoundingClientRect();
      if (!rect.width) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = Math.round(rect.width);
      H = Math.round(rect.height || 420);
      if (canvas.width !== W * dpr || canvas.height !== H * dpr) {
        canvas.width = W * dpr;
        canvas.height = H * dpr;
      }
    }
    resize();
    window.addEventListener('resize', function () {
      resize();
      redrawStill();
    });

    // Pause the animation loop while the stage is not on screen: scrolled past,
    // hidden by CSS (display:none never intersects), or the tab is backgrounded.
    var onScreen = true;
    var looping = false;
    function shouldAnimate() {
      return !REDUCED_MOTION && onScreen && !(document.hidden === true);
    }
    function wake() {
      if (looping || !shouldAnimate()) return;
      looping = true;
      requestAnimationFrame(renderFrame);
    }
    if (typeof IntersectionObserver !== 'undefined') {
      new IntersectionObserver(function (entries) {
        onScreen = entries.some(function (e) {
          return e.isIntersecting;
        });
        if (onScreen) resize();
        wake();
      }).observe(canvas);
    }
    document.addEventListener('visibilitychange', wake);

    function drawPlaneContent(pIdx, y, cam, m) {
      var pw = 132;
      var pd = 84;
      var slop = m.slopFactor;
      var isHover = state.hoveredPlane === pIdx;
      var isScanPlane =
        state.liveScanActive && SCAN_PHASES[state.liveScanPhase] && SCAN_PHASES[state.liveScanPhase].plane === pIdx;

      // Base sheet polygon
      var corners = [
        [-pw, y, -pd],
        [pw, y, -pd],
        [pw, y, pd],
        [-pw, y, pd],
      ];

      var planeFill =
        pIdx === 0 && slop > 0.45 && state.specimenKey === 'heavy'
          ? lerpColor(COLORS.panel, '#1B1A2E', slop * 0.85)
          : rgba(COLORS.panel, isHover ? 0.96 : 0.88);

      var planeStroke = isScanPlane
        ? COLORS.clean
        : isHover
          ? COLORS.ink
          : slop > 0.35 && m.spec.tells.some(function (t) { return t.plane === pIdx && slop >= t.minSlop; })
            ? rgba(COLORS.heavy, 0.65)
            : COLORS.borderBtn;

      var projectedCorners = drawPoly3D(
        ctx,
        corners,
        cam,
        planeFill,
        planeStroke,
        isHover || isScanPlane ? 1.8 : 1.1
      );

      // Layer sub-geometry drawn in 3D coordinates on the plane
      if (pIdx === 0) {
        // PLANE 01: Surface & Backdrop
        if (slop > 0.3 && state.specimenKey === 'heavy') {
          // Aurora blob rings in 3D
          var blobPts = [];
          for (var a = 0; a < 16; a++) {
            var ang = (a / 16) * Math.PI * 2;
            blobPts.push([-45 + Math.cos(ang) * 44 * slop, y - 0.5, -10 + Math.sin(ang) * 28 * slop]);
          }
          drawPoly3D(ctx, blobPts, cam, rgba(COLORS.slopViolet, 0.26 * slop), rgba(COLORS.heavy, 0.5 * slop), 1, [3, 3]);
        } else {
          // Clean editorial ruled grid on surface
          for (var gx = -96; gx <= 96; gx += 48) {
            drawLine3D(ctx, [gx, y - 0.5, -pd + 10], [gx, y - 0.5, pd - 10], cam, rgba(COLORS.border, 0.8), 0.8);
          }
        }
      } else if (pIdx === 1) {
        // PLANE 02: Hero Typography & Eyebrow
        // Eyebrow: rounded pill when sloppy -> crisp ledger line when clean
        var pillW = lerp(90, 38, slop);
        var pillZ = -44;
        if (slop > 0.35) {
          drawPoly3D(
            ctx,
            [
              [-pillW, y - 1, pillZ - 9],
              [pillW, y - 1, pillZ - 9],
              [pillW, y - 1, pillZ + 9],
              [-pillW, y - 1, pillZ + 9],
            ],
            cam,
            rgba(COLORS.slopViolet, 0.22 * slop),
            COLORS.heavy,
            1.1
          );
        } else {
          // 1.5px structural ink ledger rule
          drawLine3D(ctx, [-96, y - 1, pillZ], [96, y - 1, pillZ], cam, COLORS.ink, 1.8);
        }

        // H1 Display bar
        var h1Fill = slop > 0.25 ? lerpColor(COLORS.ink, COLORS.slopViolet, slop * 0.85) : COLORS.ink;
        drawPoly3D(
          ctx,
          [
            [-88, y - 1, -14],
            [88, y - 1, -14],
            [88, y - 1, 8],
            [-88, y - 1, 8],
          ],
          cam,
          h1Fill,
          null
        );
        // Sub-headline bar
        drawPoly3D(
          ctx,
          [
            [-64, y - 1, 18],
            [64, y - 1, 18],
            [64, y - 1, 28],
            [-64, y - 1, 28],
          ],
          cam,
          rgba(COLORS.text3, 0.55),
          null
        );
      } else if (pIdx === 2) {
        // PLANE 03: Scan Bar & CTA Button
        // Input frame
        drawPoly3D(
          ctx,
          [
            [-92, y - 1, -18],
            [32, y - 1, -18],
            [32, y - 1, 16],
            [-92, y - 1, 16],
          ],
          cam,
          COLORS.paper,
          COLORS.ink,
          1.2
        );
        // CTA Button (VibeCode Purple + Glow vs Ink/Green)
        var ctaFill = slop > 0.15 ? lerpColor(COLORS.clean, COLORS.slopViolet, slop) : COLORS.ink;
        if (slop > 0.25 && state.specimenKey === 'heavy') {
          // Outer colored glow halo
          drawPoly3D(
            ctx,
            [
              [30, y - 0.5, -26],
              [102, y - 0.5, -26],
              [102, y - 0.5, 24],
              [30, y - 0.5, 24],
            ],
            cam,
            rgba(COLORS.slopPink, 0.22 * slop),
            rgba(COLORS.heavy, 0.55 * slop),
            1,
            [2, 2]
          );
        }
        drawPoly3D(
          ctx,
          [
            [36, y - 1.2, -18],
            [94, y - 1.2, -18],
            [94, y - 1.2, 16],
            [36, y - 1.2, 16],
          ],
          cam,
          ctaFill,
          COLORS.ink,
          1
        );
      } else if (pIdx === 3) {
        // PLANE 04: 3-Up Card Grid / Bento vs Editorial Ledger
        for (var c = 0; c < 3; c++) {
          var cx0 = -96 + c * 68;
          var cx1 = cx0 + 56;
          drawPoly3D(
            ctx,
            [
              [cx0, y - 1, -42],
              [cx1, y - 1, -42],
              [cx1, y - 1, 42],
              [cx0, y - 1, 42],
            ],
            cam,
            COLORS.paper,
            slop > 0.3 ? rgba(COLORS.heavy, 0.65) : COLORS.borderBtn,
            1
          );
          if (slop > 0.2 && state.specimenKey === 'heavy') {
            // 4px thick top accent stripe tell
            drawLine3D(ctx, [cx0, y - 1.5, -42], [cx1, y - 1.5, -42], cam, COLORS.heavy, 3.2);
          } else {
            // Crisp 1.5px ink ledger rule
            drawLine3D(ctx, [cx0, y - 1.5, -42], [cx1, y - 1.5, -42], cam, COLORS.ink, 1.5);
          }
        }
      } else if (pIdx === 4) {
        // PLANE 05: Copy & AEO Agent Discovery Layer
        var barColor = slop > 0.4 ? rgba(COLORS.mild, 0.75) : rgba(COLORS.clean, 0.8);
        for (var r = 0; r < 3; r++) {
          var rz = -34 + r * 26;
          drawPoly3D(
            ctx,
            [
              [-92, y - 1, rz],
              [92 - r * 22, y - 1, rz],
              [92 - r * 22, y - 1, rz + 10],
              [-92, y - 1, rz + 10],
            ],
            cam,
            barColor,
            null
          );
        }
      }

      return projectedCorners;
    }

    function renderFrame() {
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, W, H);

      // Smooth spring interpolation
      if (!REDUCED_MOTION) {
        state.time += 0.016;
        state.morph = lerp(state.morph, state.targetMorph, 0.09);
        if (Math.abs(state.morph - state.targetMorph) < 0.002) {
          state.morph = state.targetMorph;
        } else {
          syncReadout();
        }
        state.explode = lerp(state.explode, state.targetExplode, 0.1);
        state.yaw = lerp(state.yaw, state.targetYaw, 0.12);
        state.pitch = lerp(state.pitch, state.targetPitch, 0.12);

        // Scan laser vertical sweep across the 3D stack
        var sweepSpeed = state.liveScanActive ? 3.2 : 1.15;
        state.scanY += state.scanDir * sweepSpeed;
        if (state.scanY > 130) {
          state.scanY = 130;
          state.scanDir = -1;
        } else if (state.scanY < -130) {
          state.scanY = -130;
          state.scanDir = 1;
        }
      }

      // Live scan timer & phase progression
      if (state.liveScanActive) {
        var elapsedMs = Date.now() - state.liveScanStart;
        var phaseIdx = Math.min(SCAN_PHASES.length - 1, Math.floor(elapsedMs / 1500));
        state.liveScanPhase = phaseIdx;
        if (elLiveTimer) elLiveTimer.textContent = (elapsedMs / 1000).toFixed(1) + 's';
        if (elLivePhase) elLivePhase.textContent = SCAN_PHASES[phaseIdx].label;
      }

      // Background subtle engineering grid + corner reticles
      ctx.strokeStyle = rgba(COLORS.border, 0.65);
      ctx.lineWidth = 1;
      var step = 28;
      for (var gx = step; gx < W; gx += step) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, H);
        ctx.stroke();
      }
      for (var gy = step; gy < H; gy += step) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(W, gy);
        ctx.stroke();
      }

      var cam = {
        cx: W * 0.52,
        cy: H * 0.53,
        yaw: state.yaw,
        pitch: state.pitch,
        fov: Math.min(W, H) * 1.42,
        dist: 540,
      };

      var m = currentMetrics();

      // 3D Vertical Z-caliper axis pillars at the 4 corners
      var pillarCoords = [
        [-132, -84],
        [132, -84],
        [132, 84],
        [-132, 84],
      ];
      for (var pi = 0; pi < pillarCoords.length; pi++) {
        var px = pillarCoords[pi][0];
        var pz = pillarCoords[pi][1];
        drawLine3D(
          ctx,
          [px, -125 * state.explode, pz],
          [px, 125 * state.explode, pz],
          cam,
          rgba(COLORS.borderBtn, 0.6),
          1,
          [3, 4]
        );
      }

      // Draw the 5 DOM planes from bottom (L01, largest Y) to top (L05, smallest Y)
      var layerLeftAnchors = [];
      for (var i = 0; i < PLANE_META.length; i++) {
        var yPos = PLANE_META[i].yBase * state.explode;
        drawPlaneContent(i, yPos, cam, m);
        var leftEdgePt = project3D(-132, yPos, 0, cam);
        layerLeftAnchors.push({
          idx: i,
          id: PLANE_META[i].id,
          pt: leftEdgePt,
          gy: clamp(leftEdgePt.y - 9, 34, H - 24),
        });
      }

      // Draw fixed left gutter for L01–L05 outside the callout zone so nothing ever overlaps them
      layerLeftAnchors.sort(function (a, b) {
        return a.pt.y - b.pt.y;
      });
      for (var li = 1; li < layerLeftAnchors.length; li++) {
        if (layerLeftAnchors[li].gy < layerLeftAnchors[li - 1].gy + 22) {
          layerLeftAnchors[li].gy = layerLeftAnchors[li - 1].gy + 22;
        }
      }
      ctx.save();
      ctx.font = '700 11.5px "JetBrains Mono", monospace';
      for (var lj = 0; lj < layerLeftAnchors.length; lj++) {
        var la = layerLeftAnchors[lj];
        var isHov = state.hoveredPlane === la.idx;
        var isScan =
          state.liveScanActive &&
          SCAN_PHASES[state.liveScanPhase] &&
          SCAN_PHASES[state.liveScanPhase].plane === la.idx;
        var gx0 = 8;
        var gy0 = la.gy;
        var gw0 = 32;
        var gh0 = 18;

        ctx.fillStyle = isHov || isScan ? COLORS.cleanText : COLORS.paper2;
        ctx.fillRect(gx0, gy0, gw0, gh0);
        ctx.strokeStyle = isHov || isScan ? COLORS.clean : COLORS.borderBtn;
        ctx.lineWidth = 1;
        ctx.strokeRect(gx0 + 0.5, gy0 + 0.5, gw0 - 1, gh0 - 1);

        ctx.fillStyle = isHov || isScan ? '#F4F5F2' : COLORS.ink;
        ctx.textAlign = 'center';
        ctx.fillText(la.id, gx0 + gw0 * 0.5, gy0 + 13);
      }
      ctx.restore();

      // Draw the sweeping 3D optical laser scan plane
      if (!REDUCED_MOTION) {
        var sy = state.scanY * state.explode;
        var scanColor = m.tier === 'Clean' ? COLORS.clean : m.tier === 'Mild' ? COLORS.mild : COLORS.heavy;
        drawPoly3D(
          ctx,
          [
            [-146, sy, -96],
            [146, sy, -96],
            [146, sy, 96],
            [-146, sy, 96],
          ],
          cam,
          rgba(scanColor, 0.09),
          rgba(scanColor, 0.85),
          1.5
        );
      }

      // Draw 3D callout pins for triggered slop patterns with left/right collision avoidance
      // Left callouts start at bx = 46 (clear of the 8..40px L01-L05 gutter)
      ctx.font = '700 11.5px "JetBrains Mono", monospace';
      var leftPins = [];
      var rightPins = [];
      for (var ti = 0; ti < m.activeTells.length; ti++) {
        var tell = m.activeTells[ti];
        var py = PLANE_META[tell.plane].yBase * state.explode;
        var pt = project3D(tell.x, py - 4, tell.z, cam);
        var labelTxt = tell.code + ' ' + tell.name;
        var tw = Math.ceil(ctx.measureText(labelTxt).width) + 14;
        var isRight = tell.x > 0 || (tell.x === 0 && tell.plane >= 3);
        var entry = {
          tell: tell,
          pt: pt,
          labelTxt: labelTxt,
          tw: tw,
          isRight: isRight,
          by: clamp(pt.y - 10, 34, H - 26),
        };
        if (isRight) rightPins.push(entry);
        else leftPins.push(entry);
      }

      function resolveVerticalCollisions(pins) {
        pins.sort(function (a, b) {
          return a.pt.y - b.pt.y;
        });
        var minGap = 25;
        var topBound = 34;
        var botBound = H - 24;
        for (var k = 1; k < pins.length; k++) {
          if (pins[k].by < pins[k - 1].by + minGap) {
            pins[k].by = pins[k - 1].by + minGap;
          }
        }
        if (pins.length && pins[pins.length - 1].by > botBound) {
          pins[pins.length - 1].by = botBound;
          for (var j = pins.length - 2; j >= 0; j--) {
            if (pins[j].by > pins[j + 1].by - minGap) {
              pins[j].by = Math.max(topBound, pins[j + 1].by - minGap);
            }
          }
        }
      }

      resolveVerticalCollisions(leftPins);
      resolveVerticalCollisions(rightPins);
      var allPins = leftPins.concat(rightPins);

      for (var pIdx2 = 0; pIdx2 < allPins.length; pIdx2++) {
        var pin = allPins[pIdx2];
        var bx = pin.isRight
          ? clamp(W - pin.tw - 10, 46, W - pin.tw - 8)
          : 46;
        var by = pin.by;
        var bh = 20;
        var anchorX = pin.isRight ? bx : bx + pin.tw;
        var anchorY = by + bh * 0.5;
        var elbowX = pin.isRight ? anchorX - 10 : anchorX + 10;

        // 2-segment leader line from 3D plane point to badge
        ctx.beginPath();
        ctx.moveTo(pin.pt.x, pin.pt.y);
        ctx.lineTo(elbowX, anchorY);
        ctx.lineTo(anchorX, anchorY);
        ctx.strokeStyle = rgba(COLORS.heavy, 0.85);
        ctx.lineWidth = 1.15;
        ctx.stroke();

        // Target dot on plane
        ctx.beginPath();
        ctx.arc(pin.pt.x, pin.pt.y, 3.2, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.heavy;
        ctx.fill();

        // Callout badge (full rule name, never truncated, 11.5px, 15.8:1 contrast)
        ctx.fillStyle = COLORS.inkDeep;
        ctx.fillRect(bx, by, pin.tw, bh);
        ctx.strokeStyle = COLORS.heavy;
        ctx.lineWidth = 1;
        ctx.strokeRect(bx, by, pin.tw, bh);

        ctx.fillStyle = '#F4F5F2';
        ctx.textAlign = 'left';
        ctx.fillText(pin.labelTxt, bx + 7, by + 14);
      }

      // Top-left instrument telemetry HUD inside canvas
      ctx.font = '500 11.5px "JetBrains Mono", monospace';
      ctx.fillStyle = COLORS.text3;
      ctx.textAlign = 'left';
      ctx.fillText(
        'OPTICAL DOM PROJECTION · 1280×800 VIEWPORT · DRAG TO ORBIT',
        8,
        20
      );

      ctx.restore();

      if (shouldAnimate()) {
        looping = true;
        requestAnimationFrame(renderFrame);
      } else {
        looping = false;
      }
    }

    syncReadout();
    renderFrame();

    return {
      startLiveScan: function (url) {
        state.liveScanActive = true;
        state.liveScanUrl = String(url || '').replace(/^https?:\/\//i, '');
        state.liveScanStart = Date.now();
        state.liveScanPhase = 0;
        if (elLiveBanner) elLiveBanner.hidden = false;
        syncReadout();
        redrawStill();
      },
      stopLiveScan: function () {
        state.liveScanActive = false;
        if (elLiveBanner) elLiveBanner.hidden = true;
        syncReadout();
        redrawStill();
      },
      setSpecimen: function (key) {
        if (SPECIMENS[key]) {
          state.specimenKey = key;
          state.targetMorph = key === 'clean' ? 1 : 0;
          state.morph = state.targetMorph;
          syncReadout();
          redrawStill();
        }
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. INTERACTIVE 27-PATTERN X-RAY EXPLORER
  // ═══════════════════════════════════════════════════════════════════════════
  var XRAY_CATALOGUE = [
    {
      id: 'slop_fonts',
      label: 'AI-default font stack',
      category: 'fonts',
      weight: 8,
      formula: 'firstFamily in [Inter, Geist, Space Grotesk, Satoshi, Plus Jakarta, ...]',
      reflex: 'Every v0, Bolt, and Cursor template reaches for Inter, Geist, or Space Grotesk by reflex.',
      prescription: 'Choose a typographic voice with a point of view: Newsreader, Libre Franklin, Source Serif, or IBM Plex Sans.',
    },
    {
      id: 'purple_accent',
      label: 'VibeCode purple CTA fill',
      category: 'colors',
      weight: 8,
      formula: 'CTA fill HSL hue 240°–295° && sat >= 35% && 15% < l < 85%',
      reflex: 'Tailwind indigo-500/violet-600 (#6366F1 / #8B5CF6) on primary buttons is the #1 visual signature of generated UI.',
      prescription: 'Anchor primary CTAs in high-contrast architectural ink (#181815) or a domain-specific terrestrial hue (#1FA85E).',
    },
    {
      id: 'cream_default_bg',
      label: 'Warm cream / beige page surface',
      category: 'colors',
      weight: 7,
      formula: 'R >= G >= B && min(R,G,B) >= 209 && 6 <= (R - B) <= 48',
      reflex: '2026 LLM prompts ("make it editorial") converged on warm oatmeal/cream backgrounds (#FAF8F5 / #F5F0E6).',
      prescription: 'Use crisp cool architectural paper (#F4F5F2 where G > R) or pure daylight surface (#FBFBF9).',
    },
    {
      id: 'low_contrast_text',
      label: 'Washed-out grey body copy',
      category: 'colors',
      weight: 7,
      formula: 'WCAG contrastRatio(fg, bg) < 4.5 on >= 25% of prose nodes',
      reflex: 'Muted slate-400/zinc-500 body copy on light surfaces fails WCAG AA and reads as unedited template output.',
      prescription: 'Keep body prose at >= 8:1 contrast (#181815 or #3A3B33 on #F4F5F2) and darkened AA hues for status labels.',
    },
    {
      id: 'gradient_text',
      label: 'Hero gradient-clipped H1',
      category: 'colors',
      weight: 6,
      formula: 'background-clip: text && /(linear|radial)-gradient/.test(backgroundImage)',
      reflex: 'Clipping a purple-to-cyan or white-to-zinc gradient into the hero H1 to manufacture visual excitement.',
      prescription: 'Set headlines in solid near-black ink (#181815); use italic weight or scale contrast for emphasis.',
    },
    {
      id: 'accent_stripe',
      label: 'Single-side colored border stripe',
      category: 'layout',
      weight: 6,
      formula: 'borderTopWidth >= 3px (or borderLeftWidth >= 3px) on >= 2 cards',
      reflex: 'Decorating cards with a thick 4px colored top or left border stripe instead of structural hierarchy.',
      prescription: 'Use uniform 1px solid borders (#DBDDD6) or a structural 1.5px full-width ink section ledger.',
    },
    {
      id: 'hero_eyebrow_pill',
      label: 'Rounded launch pill above H1',
      category: 'layout',
      weight: 5,
      formula: 'borderRadius >= height/3 above H1 matching /beta|new|introducing|v\\d+/i',
      reflex: 'A pill badge above the headline announcing "Now in Public Beta" or "Introducing v2.0".',
      prescription: 'Use an unbordered monospace registration line (01 · methodology) flush with the grid.',
    },
    {
      id: 'aurora_mesh_gradient',
      label: 'Blurred aurora / mesh backdrop blobs',
      category: 'css',
      weight: 5,
      formula: '>= 2 radial/conic-gradient orbs with filter: blur(>= 24px)',
      reflex: 'Floating blurred purple/cyan radial-gradient orbs behind the hero to fill empty space.',
      prescription: 'Let paper whitespace or real product geometry carry the hero; zero blurred backdrop divs.',
    },
    {
      id: 'crushed_tracking',
      label: 'Over-tightened display letter-spacing',
      category: 'fonts',
      weight: 5,
      formula: 'fontSize >= 28px && letterSpacing / fontSize <= -0.05em',
      reflex: 'Crushing display tracking to -0.06em (`tracking-tighter`), causing glyphs to collide.',
      prescription: 'Keep display tracking between -0.01em and -0.03em so letterforms breathe.',
    },
    {
      id: 'gradient_letter_avatars',
      label: 'Gradient-backed initial avatars',
      category: 'images',
      weight: 5,
      formula: '>= 2 square/round 28–96px tiles with 1–3 initials on gradient fill',
      reflex: 'Fabricated customer testimonials using gradient circles with initials ("JD", "SK") instead of real people.',
      prescription: 'Use real verified photography or omit unverified testimonials entirely ("empty is better than fake").',
    },
    {
      id: 'glassmorphism',
      label: 'Translucent backdrop-filter blur cards',
      category: 'css',
      weight: 4,
      formula: '>= 2 elements with backdrop-filter: blur() && 0 < bg.alpha < 0.8',
      reflex: 'Stacking milky translucent blurred panels over gradient blobs.',
      prescription: 'Use opaque or high-density (>= 0.92 alpha) paper surfaces with crisp 1px borders.',
    },
    {
      id: 'colored_glows',
      label: 'Large chromatic box-shadow glows',
      category: 'css',
      weight: 4,
      formula: 'box-shadow blur >= 24px with chromatic RGB spread > 60',
      reflex: 'Adding neon drop-shadows around buttons and feature cards.',
      prescription: 'Rely on 1px hairlines for card boundaries; restrict shadows to a 1px flat badge elevation.',
    },
    {
      id: 'bento_grid',
      label: 'Rounded multi-span bento card wall',
      category: 'layout',
      weight: 4,
      formula: 'CSS grid with >= 5 children, >= 4 with radius >= 12px, >= 2 column spans',
      reflex: 'An Apple-keynote wall of 16px-rounded bento boxes filled with decorative filler graphics.',
      prescription: 'Keep card radii <= 8–10px and organize specifications in typographic ledgers.',
    },
    {
      id: 'nested_cards',
      label: 'Cards nested inside cards',
      category: 'layout',
      weight: 4,
      formula: '>= 3 bordered+filled inner containers inside bordered+filled outer cards',
      reflex: 'Wrapping every paragraph and list item in its own bordered, tinted sub-card inside a parent card.',
      prescription: 'Use 1px horizontal row dividers (border-bottom) inside a panel instead of nested boxes.',
    },
    {
      id: 'buzzword_density',
      label: 'Copy axis · AI buzzword lexicon',
      category: 'copy',
      weight: 7,
      formula: '>= 4 distinct or >= 6/1k density of [seamless, robust, elevate, delve, ...]',
      reflex: 'LLM-default verbs and adjectives that sound impressive while stating zero concrete facts.',
      prescription: 'State exact mechanisms, measurements, and latencies in plain, verifiable nouns and verbs.',
    },
    {
      id: 'antithesis_construction',
      label: 'Copy axis · Antithesis framing',
      category: 'copy',
      weight: 6,
      formula: '>= 2 matches of "not just X, it\'s Y" / "more than just"',
      reflex: 'Rhetorical contrast crutches generated by RLHF-tuned copywriting models.',
      prescription: 'Say what the product does directly in the first clause without theatrical negation.',
    },
  ];

  function initPatternXray() {
    var listEl = document.getElementById('xrayList');
    var canvas = document.getElementById('patternXrayCanvas');
    if (!listEl || !canvas) return;
    var ctx = canvas.getContext('2d');
    var activeFilter = 'all';
    var selectedItem = XRAY_CATALOGUE[0];

    var elTitle = document.getElementById('xrayTitle');
    var elMeta = document.getElementById('xrayMeta');
    var elFormula = document.getElementById('xrayFormula');
    var elReflex = document.getElementById('xrayReflex');
    var elFix = document.getElementById('xrayFix');

    function updateInspector(item) {
      selectedItem = item;
      if (elTitle) elTitle.textContent = item.label;
      if (elMeta) elMeta.textContent = item.id + ' · ' + item.category + ' · weight +' + item.weight;
      if (elFormula) elFormula.textContent = item.formula;
      if (elReflex) elReflex.textContent = item.reflex;
      if (elFix) elFix.textContent = item.prescription;
      drawXraySpecimen(item);
    }

    function renderList() {
      var items = XRAY_CATALOGUE.filter(function (it) {
        return activeFilter === 'all' || it.category === activeFilter;
      });
      listEl.innerHTML = items
        .map(function (it) {
          var isSel = selectedItem && selectedItem.id === it.id;
          return (
            '<button type="button" class="xray-item' +
            (isSel ? ' active' : '') +
            '" data-xray-id="' +
            it.id +
            '" role="option" aria-selected="' +
            (isSel ? 'true' : 'false') +
            '">' +
            '<span class="xray-item-w">+' +
            it.weight +
            '</span>' +
            '<span class="xray-item-name">' +
            it.label +
            '</span>' +
            '<span class="xray-item-cat">' +
            it.category +
            '</span>' +
            '</button>'
          );
        })
        .join('');

      listEl.querySelectorAll('[data-xray-id]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var id = btn.getAttribute('data-xray-id');
          var found = XRAY_CATALOGUE.find(function (x) {
            return x.id === id;
          });
          if (found) {
            updateInspector(found);
            renderList();
          }
        });
      });
    }

    document.querySelectorAll('[data-xray-filter]').forEach(function (tab) {
      tab.addEventListener('click', function () {
        activeFilter = tab.getAttribute('data-xray-filter') || 'all';
        document.querySelectorAll('[data-xray-filter]').forEach(function (t) {
          var on = t.getAttribute('data-xray-filter') === activeFilter;
          t.classList.toggle('active', on);
          t.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        var first = XRAY_CATALOGUE.find(function (it) {
          return activeFilter === 'all' || it.category === activeFilter;
        });
        if (first) selectedItem = first;
        renderList();
        if (selectedItem) updateInspector(selectedItem);
      });
    });

    function drawHeadlineFit(ctx, text, x, y, maxW, basePx, weightAndFamily, trackingEm, color) {
      ctx.save();
      var px = basePx;
      ctx.font = weightAndFamily.replace('{px}', String(px));
      if ('letterSpacing' in ctx) {
        ctx.letterSpacing = trackingEm;
      }
      var measured = ctx.measureText(text).width;
      if (measured > maxW && measured > 0) {
        px = Math.max(18, Math.floor(( basePx * maxW ) / measured));
        ctx.font = weightAndFamily.replace('{px}', String(px));
      }
      ctx.fillStyle = color;
      ctx.textAlign = 'left';
      ctx.fillText(text, x, y);
      if ('letterSpacing' in ctx) {
        ctx.letterSpacing = '0px';
      }
      ctx.restore();
    }

    function drawXraySpecimen(item) {
      if (!ctx) return;
      var rect = canvas.getBoundingClientRect();
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var W = Math.round(rect.width || 520);
      var stacked = W < 440;
      var H = stacked ? 256 : 136;
      canvas.style.height = H + 'px';
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, W, H);

      var mid = Math.floor(W / 2);
      var midY = Math.floor(H / 2);

      var bBox, aBox;
      if (stacked) {
        bBox = { x: 0, y: 0, w: W, h: midY - 4 };
        aBox = { x: 0, y: midY + 4, w: W, h: H - midY - 4 };
      } else {
        bBox = { x: 0, y: 0, w: mid - 5, h: H };
        aBox = { x: mid + 5, y: 0, w: W - mid - 5, h: H };
      }

      // Before box: AI Slop Reflex (Tinted Red/Warm)
      ctx.fillStyle = '#F7E9E5';
      ctx.fillRect(bBox.x, bBox.y, bBox.w, bBox.h);
      ctx.strokeStyle = '#E0B6AE';
      ctx.strokeRect(bBox.x + 0.5, bBox.y + 0.5, bBox.w - 1, bBox.h - 1);

      // After box: Editorial Fix (Tinted Clean Green)
      ctx.fillStyle = '#E9F4EE';
      ctx.fillRect(aBox.x, aBox.y, aBox.w, aBox.h);
      ctx.strokeStyle = '#A9D8BD';
      ctx.strokeRect(aBox.x + 0.5, aBox.y + 0.5, aBox.w - 1, aBox.h - 1);

      // Headers (12px mono)
      ctx.font = '700 12px "JetBrains Mono", monospace';
      ctx.fillStyle = COLORS.heavyText;
      ctx.fillText('✗ AI REFLEX (+' + item.weight + ' PTS)', bBox.x + 12, bBox.y + 18);
      ctx.fillStyle = COLORS.cleanText;
      ctx.fillText('✓ EDITORIAL (+0 PTS)', aBox.x + 12, aBox.y + 18);

      // Sample stage box (compact, zero empty space, caption below at y = box.y + box.h - 8)
      var lx = bBox.x + 10,
        ly = bBox.y + 25,
        lw = bBox.w - 20,
        lh = bBox.h - 50;
      var rx = aBox.x + 10,
        ry = aBox.y + 25,
        rw = aBox.w - 20,
        rh = aBox.h - 50;

      var leftCaption = 'generic sans rhythm';
      var rightCaption = 'optical 6..72 · 2.8x scale';

      if (item.category === 'fonts') {
        // Sample surface
        ctx.fillStyle = COLORS.panel;
        ctx.fillRect(lx, ly, lw, lh);
        ctx.strokeStyle = COLORS.border;
        ctx.strokeRect(lx + 0.5, ly + 0.5, lw - 1, lh - 1);

        ctx.fillStyle = COLORS.panel;
        ctx.fillRect(rx, ry, rw, rh);
        ctx.strokeStyle = COLORS.border;
        ctx.strokeRect(rx + 0.5, ry + 0.5, rw - 1, rh - 1);

        // Render sample headline ("Ship faster with less") at 32px in actual font & tracking
        drawHeadlineFit(
          ctx,
          'Ship faster with less',
          lx + 10,
          ly + Math.round(lh * 0.66),
          lw - 20,
          32,
          '700 {px}px Inter, -apple-system, BlinkMacSystemFont, sans-serif',
          '-0.06em',
          COLORS.ink
        );
        drawHeadlineFit(
          ctx,
          'Ship faster with less',
          rx + 10,
          ry + Math.round(rh * 0.66),
          rw - 20,
          32,
          '500 {px}px "Newsreader", Georgia, serif',
          '-0.02em',
          COLORS.ink
        );

        leftCaption =
          item.id === 'crushed_tracking'
            ? 'Inter at -0.06em · crushed tracking'
            : 'generic sans rhythm · Inter -0.06em';
        rightCaption = 'optical 6..72 · 2.8x scale · -0.02em';
      } else if (item.id === 'purple_accent') {
        // Left: VibeCode purple CTA button
        ctx.fillStyle = '#18162B';
        ctx.fillRect(lx, ly, lw, lh);
        var btnH = Math.min(36, lh - 18);
        var btnY = ly + Math.round((lh - btnH) / 2);
        ctx.fillStyle = COLORS.slopViolet;
        ctx.fillRect(lx + 18, btnY, lw - 36, btnH);
        ctx.font = '600 13px Inter, sans-serif';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.fillText('Get Started Free →', lx + lw / 2, btnY + Math.round(btnH * 0.64));
        ctx.textAlign = 'left';

        // Right: Neutral carbon-ink CTA button
        ctx.fillStyle = COLORS.paper;
        ctx.fillRect(rx, ry, rw, rh);
        ctx.strokeStyle = COLORS.border;
        ctx.strokeRect(rx + 0.5, ry + 0.5, rw - 1, rh - 1);
        ctx.fillStyle = COLORS.ink;
        ctx.fillRect(rx + 18, btnY - ly + ry, rw - 36, btnH);
        ctx.font = '500 13px "JetBrains Mono", monospace';
        ctx.fillStyle = COLORS.paper;
        ctx.textAlign = 'center';
        ctx.fillText('Scan your page →', rx + rw / 2, btnY - ly + ry + Math.round(btnH * 0.64));
        ctx.textAlign = 'left';

        leftCaption = '#6366F1 indigo-500 · HSL 239° reflex';
        rightCaption = '#181815 carbon ink · 16.2:1 AA';
      } else if (item.id === 'gradient_text') {
        // Left: Gradient-clipped H1 vs plain solid H1
        ctx.fillStyle = '#14141F';
        ctx.fillRect(lx, ly, lw, lh);
        var grad = ctx.createLinearGradient(lx + 10, ly, lx + lw - 10, ly);
        grad.addColorStop(0, '#818CF8');
        grad.addColorStop(0.55, '#EC4899');
        grad.addColorStop(1, '#38BDF8');
        drawHeadlineFit(
          ctx,
          'Ship faster with less',
          lx + 10,
          ly + Math.round(lh * 0.66),
          lw - 20,
          30,
          '700 {px}px Inter, sans-serif',
          '-0.04em',
          grad
        );

        ctx.fillStyle = COLORS.panel;
        ctx.fillRect(rx, ry, rw, rh);
        ctx.strokeStyle = COLORS.border;
        ctx.strokeRect(rx + 0.5, ry + 0.5, rw - 1, rh - 1);
        drawHeadlineFit(
          ctx,
          'Ship faster with less',
          rx + 10,
          ry + Math.round(rh * 0.66),
          rw - 20,
          30,
          '500 {px}px "Newsreader", Georgia, serif',
          '-0.02em',
          COLORS.ink
        );

        leftCaption = 'background-clip: text gradient H1';
        rightCaption = 'solid #181815 ink serif H1';
      } else if (item.id === 'cream_default_bg') {
        // Left: Warm oatmeal cream surface vs cool archival paper
        ctx.fillStyle = '#F5ECD9';
        ctx.fillRect(lx, ly, lw, lh);
        ctx.strokeStyle = '#DECBB1';
        ctx.strokeRect(lx + 0.5, ly + 0.5, lw - 1, lh - 1);
        ctx.font = '500 20px "Newsreader", Georgia, serif';
        ctx.fillStyle = '#2A241B';
        ctx.fillText('Warm oatmeal #F5ECD9', lx + 12, ly + Math.round(lh * 0.62));

        ctx.fillStyle = COLORS.paper;
        ctx.fillRect(rx, ry, rw, rh);
        ctx.strokeStyle = COLORS.border;
        ctx.strokeRect(rx + 0.5, ry + 0.5, rw - 1, rh - 1);
        ctx.font = '500 20px "Newsreader", Georgia, serif';
        ctx.fillStyle = COLORS.ink;
        ctx.fillText('Cool paper #F4F5F2', rx + 12, ry + Math.round(rh * 0.62));

        leftCaption = 'R=245 G=236 B=217 (R - B = +28)';
        rightCaption = 'R=244 G=245 B=242 (neutral G >= R)';
      } else if (item.id === 'low_contrast_text') {
        // Left: Washed-out slate grey vs crisp AA body copy
        ctx.fillStyle = '#F8FAFC';
        ctx.fillRect(lx, ly, lw, lh);
        ctx.strokeStyle = COLORS.border;
        ctx.strokeRect(lx + 0.5, ly + 0.5, lw - 1, lh - 1);
        ctx.font = '400 13px sans-serif';
        ctx.fillStyle = '#94A3B8';
        ctx.fillText('Muted grey body copy fails AA.', lx + 10, ly + Math.round(lh * 0.45));
        ctx.fillText('Contrast ratio is only 2.5:1.', lx + 10, ly + Math.round(lh * 0.78));

        ctx.fillStyle = COLORS.panel;
        ctx.fillRect(rx, ry, rw, rh);
        ctx.strokeStyle = COLORS.border;
        ctx.strokeRect(rx + 0.5, ry + 0.5, rw - 1, rh - 1);
        ctx.font = '400 13px "Libre Franklin", sans-serif';
        ctx.fillStyle = COLORS.ink;
        ctx.fillText('Crisp carbon-ink body copy.', rx + 10, ry + Math.round(rh * 0.45));
        ctx.fillText('Contrast ratio is 16.2:1 AA.', rx + 10, ry + Math.round(rh * 0.78));

        leftCaption = '#94A3B8 on #F8FAFC · 2.5:1 FAIL';
        rightCaption = '#181815 on #FBFBF9 · 16.2:1 AA PASS';
      } else if (item.id === 'accent_stripe') {
        // Left: 4px top colored stripe on cards vs 1.5px structural ink ledger
        ctx.fillStyle = COLORS.panel;
        ctx.fillRect(lx, ly, lw, lh);
        var cw = Math.floor((lw - 24) / 2);
        for (var sc = 0; sc < 2; sc++) {
          var sx = lx + 8 + sc * (cw + 8);
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(sx, ly + 8, cw, lh - 16);
          ctx.strokeStyle = COLORS.border;
          ctx.strokeRect(sx + 0.5, ly + 8.5, cw - 1, lh - 17);
          ctx.fillStyle = sc === 0 ? COLORS.slopViolet : COLORS.heavy;
          ctx.fillRect(sx, ly + 8, cw, 4);
        }

        ctx.fillStyle = COLORS.panel;
        ctx.fillRect(rx, ry, rw, rh);
        ctx.strokeStyle = COLORS.ink;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(rx + 10, ry + 14);
        ctx.lineTo(rx + rw - 10, ry + 14);
        ctx.stroke();
        ctx.lineWidth = 1;
        ctx.font = '600 12px "JetBrains Mono", monospace';
        ctx.fillStyle = COLORS.cleanText;
        ctx.fillText('§ 01 · structural ledger', rx + 10, ry + 32);
        ctx.strokeStyle = COLORS.border;
        ctx.strokeRect(rx + 10.5, ry + 38.5, rw - 21, lh - 46);

        leftCaption = '4px colored top border stripe';
        rightCaption = '1.5px ink ledger + uniform 1px border';
      } else if (item.id === 'hero_eyebrow_pill') {
        // Left: Rounded launch pill above H1 vs plain mono line
        ctx.fillStyle = COLORS.panel;
        ctx.fillRect(lx, ly, lw, lh);
        ctx.strokeStyle = COLORS.border;
        ctx.strokeRect(lx + 0.5, ly + 0.5, lw - 1, lh - 1);
        var pw0 = Math.min(lw - 24, 168);
        var px0 = lx + Math.round((lw - pw0) / 2);
        ctx.fillStyle = '#EEF2FF';
        ctx.beginPath();
        ctx.roundRect(px0, ly + 8, pw0, 22, 11);
        ctx.fill();
        ctx.strokeStyle = COLORS.slopViolet;
        ctx.stroke();
        ctx.font = '600 11.5px "JetBrains Mono", monospace';
        ctx.fillStyle = COLORS.slopViolet;
        ctx.textAlign = 'center';
        ctx.fillText('✨ Introducing v2.0', lx + lw / 2, ly + 23);
        ctx.fillStyle = COLORS.ink;
        ctx.font = '700 16px sans-serif';
        ctx.fillText('Next-Gen Platform', lx + lw / 2, ly + lh - 10);
        ctx.textAlign = 'left';

        ctx.fillStyle = COLORS.panel;
        ctx.fillRect(rx, ry, rw, rh);
        ctx.strokeStyle = COLORS.border;
        ctx.strokeRect(rx + 0.5, ry + 0.5, rw - 1, rh - 1);
        ctx.font = '500 12px "JetBrains Mono", monospace';
        ctx.fillStyle = COLORS.cleanText;
        ctx.fillText('01 · methodology', rx + 12, ry + 22);
        ctx.font = '500 18px "Newsreader", Georgia, serif';
        ctx.fillStyle = COLORS.ink;
        ctx.fillText('Deterministic scoring', rx + 12, ry + rh - 10);

        leftCaption = 'rounded launch pill badge above H1';
        rightCaption = 'unbordered mono eyebrow line';
      } else if (item.id === 'aurora_mesh_gradient') {
        // Left: Blurred aurora blobs behind hero vs flat architectural paper hero
        ctx.fillStyle = '#121324';
        ctx.fillRect(lx, ly, lw, lh);
        var rg1 = ctx.createRadialGradient(lx + lw * 0.35, ly + lh * 0.45, 2, lx + lw * 0.35, ly + lh * 0.45, 44);
        rg1.addColorStop(0, 'rgba(99,102,241,0.85)');
        rg1.addColorStop(1, 'rgba(99,102,241,0)');
        ctx.fillStyle = rg1;
        ctx.fillRect(lx, ly, lw, lh);
        var rg2 = ctx.createRadialGradient(lx + lw * 0.7, ly + lh * 0.55, 2, lx + lw * 0.7, ly + lh * 0.55, 42);
        rg2.addColorStop(0, 'rgba(236,72,153,0.8)');
        rg2.addColorStop(1, 'rgba(236,72,153,0)');
        ctx.fillStyle = rg2;
        ctx.fillRect(lx, ly, lw, lh);
        ctx.font = '700 15px Inter, sans-serif';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText('AI-Powered Workflow', lx + 12, ly + Math.round(lh * 0.48));
        ctx.font = '500 11.5px "JetBrains Mono", monospace';
        ctx.fillStyle = '#E0E7FF';
        ctx.fillText('2× radial-gradient blur(64px)', lx + 12, ly + Math.round(lh * 0.78));

        ctx.fillStyle = COLORS.paper;
        ctx.fillRect(rx, ry, rw, rh);
        ctx.strokeStyle = COLORS.border;
        ctx.strokeRect(rx + 0.5, ry + 0.5, rw - 1, rh - 1);
        for (var gx2 = rx + 28; gx2 < rx + rw; gx2 += 28) {
          ctx.beginPath();
          ctx.moveTo(gx2, ry);
          ctx.lineTo(gx2, ry + rh);
          ctx.stroke();
        }
        ctx.fillStyle = COLORS.ink;
        ctx.fillRect(rx + 12, ry + 10, rw - 24, 2);
        ctx.font = '500 17px "Newsreader", Georgia, serif';
        ctx.fillStyle = COLORS.ink;
        ctx.fillText('Deterministic DOM audit', rx + 12, ry + Math.round(rh * 0.54));
        ctx.font = '500 11.5px "JetBrains Mono", monospace';
        ctx.fillStyle = COLORS.cleanText;
        ctx.fillText('#F4F5F2 matte paper · 0 blobs', rx + 12, ry + Math.round(rh * 0.8));

        leftCaption = 'radial-gradient orbs + blur(48px)';
        rightCaption = 'flat #F4F5F2 paper · zero blobs';
      } else if (item.id === 'glassmorphism') {
        // Left: Blurred translucent card over gradient blob vs flat opaque card
        var bgGrad = ctx.createLinearGradient(lx, ly, lx + lw, ly + lh);
        bgGrad.addColorStop(0, '#312E81');
        bgGrad.addColorStop(1, '#831843');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(lx, ly, lw, lh);
        ctx.fillStyle = 'rgba(255,255,255,0.28)';
        ctx.fillRect(lx + 16, ly + 10, lw - 32, lh - 20);
        ctx.strokeStyle = 'rgba(255,255,255,0.55)';
        ctx.strokeRect(lx + 16.5, ly + 10.5, lw - 33, lh - 21);
        ctx.font = '600 12px "JetBrains Mono", monospace';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText('backdrop-filter: blur(16px)', lx + 24, ly + Math.round(lh * 0.58));

        ctx.fillStyle = COLORS.paper;
        ctx.fillRect(rx, ry, rw, rh);
        ctx.fillStyle = COLORS.panel;
        ctx.fillRect(rx + 16, ry + 10, rw - 32, rh - 20);
        ctx.strokeStyle = COLORS.border;
        ctx.strokeRect(rx + 16.5, ry + 10.5, rw - 33, rh - 21);
        ctx.font = '500 12px "JetBrains Mono", monospace';
        ctx.fillStyle = COLORS.ink;
        ctx.fillText('opaque #FBFBF9 · 1px solid', rx + 24, ry + Math.round(rh * 0.58));

        leftCaption = 'translucent card + backdrop blur';
        rightCaption = 'opaque paper panel + 1px border';
      } else if (item.id === 'colored_glows') {
        // Left: Chromatic box-shadow glow vs flat 1px border
        ctx.fillStyle = '#13131F';
        ctx.fillRect(lx, ly, lw, lh);
        ctx.save();
        ctx.shadowColor = '#6366F1';
        ctx.shadowBlur = 22;
        ctx.fillStyle = COLORS.slopViolet;
        ctx.fillRect(lx + 26, ly + 14, lw - 52, lh - 28);
        ctx.restore();
        ctx.font = '600 12px "JetBrains Mono", monospace';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.fillText('28px neon shadow glow', lx + lw / 2, ly + Math.round(lh * 0.58));
        ctx.textAlign = 'left';

        ctx.fillStyle = COLORS.panel;
        ctx.fillRect(rx, ry, rw, rh);
        ctx.strokeStyle = COLORS.border;
        ctx.strokeRect(rx + 0.5, ry + 0.5, rw - 1, rh - 1);
        ctx.fillStyle = COLORS.ink;
        ctx.fillRect(rx + 26, ry + 14, rw - 52, rh - 28);
        ctx.font = '500 12px "JetBrains Mono", monospace';
        ctx.fillStyle = COLORS.paper;
        ctx.textAlign = 'center';
        ctx.fillText('flat 1px border · no glow', rx + rw / 2, ry + Math.round(rh * 0.58));
        ctx.textAlign = 'left';

        leftCaption = 'box-shadow blur >= 24px chromatic';
        rightCaption = 'crisp 1px border · zero glow';
      } else if (item.id === 'gradient_letter_avatars') {
        // Left: Gradient initial circles ("JD", "SK", "AL") vs verified source link
        ctx.fillStyle = COLORS.panel;
        ctx.fillRect(lx, ly, lw, lh);
        ctx.strokeStyle = COLORS.border;
        ctx.strokeRect(lx + 0.5, ly + 0.5, lw - 1, lh - 1);
        var initials = ['JD', 'SK', 'AL'];
        for (var ai = 0; ai < 3; ai++) {
          var cxA = lx + 28 + ai * 48;
          var cyA = ly + Math.round(lh / 2);
          var ag = ctx.createLinearGradient(cxA - 16, cyA - 16, cxA + 16, cyA + 16);
          ag.addColorStop(0, ai === 1 ? '#EC4899' : '#6366F1');
          ag.addColorStop(1, '#38BDF8');
          ctx.beginPath();
          ctx.arc(cxA, cyA, 16, 0, Math.PI * 2);
          ctx.fillStyle = ag;
          ctx.fill();
          ctx.font = '700 12px sans-serif';
          ctx.fillStyle = '#FFFFFF';
          ctx.textAlign = 'center';
          ctx.fillText(initials[ai], cxA, cyA + 4);
        }
        ctx.textAlign = 'left';

        ctx.fillStyle = COLORS.panel;
        ctx.fillRect(rx, ry, rw, rh);
        ctx.strokeStyle = COLORS.border;
        ctx.strokeRect(rx + 0.5, ry + 0.5, rw - 1, rh - 1);
        ctx.font = '500 12.5px "JetBrains Mono", monospace';
        ctx.fillStyle = COLORS.cleanText;
        ctx.fillText('github.com/ravidsrk/slop-detect ↗', rx + 12, ry + Math.round(rh * 0.46));
        ctx.fillStyle = COLORS.text2;
        ctx.fillText('verified source · zero fake avatars', rx + 12, ry + Math.round(rh * 0.76));

        leftCaption = 'gradient circles + 2-letter initials';
        rightCaption = 'verified attribution · no fake avatars';
      } else if (item.id === 'bento_grid') {
        // Left: Rounded multi-span bento grid vs clean 2-col ledger
        ctx.fillStyle = COLORS.panel;
        ctx.fillRect(lx, ly, lw, lh);
        var bw1 = Math.floor((lw - 22) * 0.6);
        var bw2 = lw - 22 - bw1;
        var bh1 = Math.floor((lh - 18) / 2);
        ctx.fillStyle = '#EEF2FF';
        ctx.strokeStyle = COLORS.heavy;
        ctx.beginPath();
        ctx.roundRect(lx + 6, ly + 5, bw1, bh1, 10);
        ctx.roundRect(lx + 10 + bw1, ly + 5, bw2, bh1, 10);
        ctx.roundRect(lx + 6, ly + 9 + bh1, bw2, bh1, 10);
        ctx.roundRect(lx + 10 + bw2, ly + 9 + bh1, bw1, bh1, 10);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = COLORS.panel;
        ctx.fillRect(rx, ry, rw, rh);
        ctx.strokeStyle = COLORS.border;
        ctx.strokeRect(rx + 6.5, ry + 5.5, rw - 13, rh - 11);
        ctx.beginPath();
        ctx.moveTo(rx + Math.floor(rw / 2), ry + 5);
        ctx.lineTo(rx + Math.floor(rw / 2), ry + rh - 6);
        ctx.moveTo(rx + 6, ry + Math.floor(rh / 2));
        ctx.lineTo(rx + rw - 6, ry + Math.floor(rh / 2));
        ctx.stroke();
        ctx.font = '600 11px "JetBrains Mono", monospace';
        ctx.fillStyle = COLORS.ink;
        ctx.fillText('01 DESIGN', rx + 12, ry + Math.floor(rh * 0.34));
        ctx.fillText('02 COPY', rx + Math.floor(rw / 2) + 8, ry + Math.floor(rh * 0.34));
        ctx.fillStyle = COLORS.cleanText;
        ctx.fillText('03 SYSTEM', rx + 12, ry + Math.floor(rh * 0.78));
        ctx.fillText('04 AEO', rx + Math.floor(rw / 2) + 8, ry + Math.floor(rh * 0.78));

        leftCaption = '16px rounded multi-span bento wall';
        rightCaption = '2×2 specification grid · 6px radius';
      } else if (item.id === 'nested_cards') {
        // Left: Cards nested inside cards vs flat row dividers
        ctx.fillStyle = COLORS.panel;
        ctx.fillRect(lx, ly, lw, lh);
        ctx.strokeStyle = COLORS.heavy;
        ctx.strokeRect(lx + 6.5, ly + 4.5, lw - 13, lh - 9);
        for (var nc = 0; nc < 2; nc++) {
          ctx.fillStyle = '#F7E9E5';
          ctx.fillRect(lx + 14, ly + 10 + nc * 26, lw - 28, 20);
          ctx.strokeRect(lx + 14.5, ly + 10.5 + nc * 26, lw - 29, 19);
        }

        ctx.fillStyle = COLORS.panel;
        ctx.fillRect(rx, ry, rw, rh);
        ctx.strokeStyle = COLORS.border;
        ctx.strokeRect(rx + 6.5, ry + 4.5, rw - 13, rh - 9);
        ctx.beginPath();
        ctx.moveTo(rx + 12, ry + Math.floor(rh / 2));
        ctx.lineTo(rx + rw - 12, ry + Math.floor(rh / 2));
        ctx.stroke();
        ctx.font = '500 12px "JetBrains Mono", monospace';
        ctx.fillStyle = COLORS.ink;
        ctx.fillText('#1  classic.com          0  A+', rx + 14, ry + Math.floor(rh * 0.36));
        ctx.fillText('#2  linear.app          19  B', rx + 14, ry + Math.floor(rh * 0.78));

        leftCaption = 'sub-cards nested inside outer card';
        rightCaption = 'single container + 1px row rules';
      } else if (item.category === 'copy') {
        // Copy tells: buzzword density / antithesis framing
        ctx.fillStyle = COLORS.panel;
        ctx.fillRect(lx, ly, lw, lh);
        ctx.strokeStyle = COLORS.border;
        ctx.strokeRect(lx + 0.5, ly + 0.5, lw - 1, lh - 1);
        ctx.font = '500 13px "Libre Franklin", sans-serif';
        ctx.fillStyle = COLORS.heavyText;
        var badCopy =
          item.id === 'antithesis_construction'
            ? '"Not just a scanner — it\'s a revolution."'
            : '"Unleash seamless, robust AI synergy."';
        ctx.fillText(badCopy, lx + 10, ly + Math.round(lh * 0.58));

        ctx.fillStyle = COLORS.panel;
        ctx.fillRect(rx, ry, rw, rh);
        ctx.strokeStyle = COLORS.border;
        ctx.strokeRect(rx + 0.5, ry + 0.5, rw - 1, rh - 1);
        ctx.font = '500 13px "Libre Franklin", sans-serif';
        ctx.fillStyle = COLORS.ink;
        var goodCopy =
          item.id === 'antithesis_construction'
            ? '"Scores 27 CSS rules on real Chromium."'
            : '"27 DOM queries run in ~8 seconds."';
        ctx.fillText(goodCopy, rx + 10, ry + Math.round(rh * 0.58));

        leftCaption =
          item.id === 'antithesis_construction'
            ? '"not just X, it\'s Y" rhetorical crutch'
            : '4 LLM filler buzzwords in 1 sentence';
        rightCaption = 'direct declarative nouns & measurements';
      } else {
        // Fallback showing the detection rule text inside the card
        ctx.fillStyle = COLORS.panel;
        ctx.fillRect(lx, ly, lw, lh);
        ctx.strokeStyle = COLORS.border;
        ctx.strokeRect(lx + 0.5, ly + 0.5, lw - 1, lh - 1);
        ctx.font = '500 12px "JetBrains Mono", monospace';
        ctx.fillStyle = COLORS.heavyText;
        ctx.fillText(String(item.formula || item.label).slice(0, 38), lx + 10, ly + Math.round(lh * 0.58));

        ctx.fillStyle = COLORS.panel;
        ctx.fillRect(rx, ry, rw, rh);
        ctx.strokeStyle = COLORS.border;
        ctx.strokeRect(rx + 0.5, ry + 0.5, rw - 1, rh - 1);
        ctx.fillStyle = COLORS.cleanText;
        ctx.fillText(String(item.prescription || 'Flat 1px surface').slice(0, 38), rx + 10, ry + Math.round(rh * 0.58));

        leftCaption = item.category + ' tell (+' + item.weight + ' pts)';
        rightCaption = '0 pts · passes rule check';
      }

      // Captions below samples (>= 12px monospace)
      ctx.font = '500 12px "JetBrains Mono", monospace';
      ctx.fillStyle = COLORS.heavyText;
      ctx.fillText(leftCaption, bBox.x + 10, bBox.y + bBox.h - 8);
      ctx.fillStyle = COLORS.cleanText;
      ctx.fillText(rightCaption, aBox.x + 10, aBox.y + aBox.h - 8);

      ctx.restore();
    }

    renderList();
    updateInspector(selectedItem);
    window.addEventListener('resize', function () {
      if (selectedItem) drawXraySpecimen(selectedItem);
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. 3D 4-AXIS POLARITY GYROSCOPE (SECTION 05)
  // ═══════════════════════════════════════════════════════════════════════════
  function initAxisGyro() {
    var canvas = document.getElementById('axisGyroCanvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    var state = {
      yaw: 0.55,
      pitch: 0.38,
      targetYaw: 0.55,
      targetPitch: 0.38,
      focusedAxis: -1, // 0=design, 1=copy, 2=system, 3=aeo
    };

    var AXES_3D = [
      { idx: 0, name: 'DESIGN SLOP (27)', polarity: '↓ 0 CLEAN', color: COLORS.heavy, vec: [-110, 0, 0] },
      { idx: 1, name: 'COPY SLOP (9)', polarity: '↓ 0 CLEAN', color: COLORS.mild, vec: [0, 0, -110] },
      { idx: 2, name: 'SYSTEM · DESIGN.MD', polarity: '↑ 100 ALIGNED', color: COLORS.system, vec: [110, 0, 0] },
      { idx: 3, name: 'AEO · AGENT-READY', polarity: '↑ 100 READY', color: COLORS.clean, vec: [0, -105, 0] },
    ];

    document.querySelectorAll('.axes .axis').forEach(function (row, idx) {
      row.addEventListener('mouseenter', function () {
        state.focusedAxis = idx;
        state.targetYaw = 0.4 + idx * 0.65;
        state.targetPitch = idx === 3 ? 0.62 : 0.34;
      });
      row.addEventListener('mouseleave', function () {
        state.focusedAxis = -1;
      });
    });

    function draw() {
      var rect = canvas.getBoundingClientRect();
      if (!rect.width) return;
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var W = Math.round(rect.width);
      var H = Math.round(rect.height || 240);
      if (canvas.width !== W * dpr || canvas.height !== H * dpr) {
        canvas.width = W * dpr;
        canvas.height = H * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, W, H);

      if (!REDUCED_MOTION) {
        if (state.focusedAxis === -1) {
          state.targetYaw += 0.0045;
        }
        state.yaw = lerp(state.yaw, state.targetYaw, 0.08);
        state.pitch = lerp(state.pitch, state.targetPitch, 0.08);
      }

      var cam = {
        cx: W * 0.5,
        cy: H * 0.54,
        yaw: state.yaw,
        pitch: state.pitch,
        fov: 460,
        dist: 360,
      };

      // Draw octahedral wireframe rings
      var ringXZ = [];
      var ringXY = [];
      for (var i = 0; i < 24; i++) {
        var a = (i / 24) * Math.PI * 2;
        ringXZ.push([Math.cos(a) * 105, 0, Math.sin(a) * 105]);
        ringXY.push([Math.cos(a) * 105, Math.sin(a) * 105, 0]);
      }
      drawPoly3D(ctx, ringXZ, cam, null, COLORS.borderBtn, 1, [3, 3]);
      drawPoly3D(ctx, ringXY, cam, null, rgba(COLORS.borderBtn, 0.7), 1);

      // Draw ideal Clean/Aligned diamond envelope
      drawPoly3D(
        ctx,
        [
          [-26, 0, 0], // Design low (clean)
          [0, 0, -26], // Copy low (clean)
          [102, 0, 0], // System high (100)
          [0, -98, 0], // AEO high (100)
        ],
        cam,
        rgba(COLORS.clean, 0.12),
        COLORS.clean,
        1.5
      );

      // Draw the 4 axis vectors and labels
      for (var k = 0; k < AXES_3D.length; k++) {
        var ax = AXES_3D[k];
        var isFocused = state.focusedAxis === k;
        var line = drawLine3D(
          ctx,
          [0, 0, 0],
          ax.vec,
          cam,
          ax.color,
          isFocused ? 2.4 : 1.4
        );
        ctx.beginPath();
        ctx.arc(line.b.x, line.b.y, isFocused ? 5 : 3.5, 0, Math.PI * 2);
        ctx.fillStyle = ax.color;
        ctx.fill();

        ctx.font = (isFocused ? '700 ' : '500 ') + '10px "JetBrains Mono", monospace';
        ctx.fillStyle = isFocused ? COLORS.ink : COLORS.text3;
        ctx.textAlign = line.b.x >= cam.cx ? 'left' : 'right';
        var tx = line.b.x + (line.b.x >= cam.cx ? 8 : -8);
        ctx.fillText(ax.name, tx, line.b.y - 2);
        ctx.fillStyle = ax.color;
        ctx.fillText(ax.polarity, tx, line.b.y + 10);
      }

      // Origin dot (0,0,0)
      var orig = project3D(0, 0, 0, cam);
      ctx.beginPath();
      ctx.arc(orig.x, orig.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.ink;
      ctx.fill();

      ctx.restore();
      if (!REDUCED_MOTION) {
        requestAnimationFrame(draw);
      }
    }

    draw();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. SCROLL-CHOREOGRAPHED LEDGER REVEALS
  // ═══════════════════════════════════════════════════════════════════════════
  function initScrollReveals() {
    if (REDUCED_MOTION || typeof IntersectionObserver === 'undefined') return;
    var targets = document.querySelectorAll('.section-ledger, .sec, .feature-card');
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    targets.forEach(function (el) {
      io.observe(el);
    });
  }

  function boot() {
    var stageApi = initHeroStage();
    initPatternXray();
    initAxisGyro();
    initScrollReveals();
    window.__slopInstrument = stageApi || {
      startLiveScan: function () {},
      stopLiveScan: function () {},
      setSpecimen: function () {},
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
