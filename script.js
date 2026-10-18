
"use strict";

/* ==========================================
   MINDDESIGN – SCRIPT.JS
   ========================================== */

/* ==========================================
   1. DEINE EINSTELLUNGEN
   Hier kannst du Animationen schneller
   oder langsamer machen.
   ========================================== */
const SETTINGS = {
  marqueeSpeed: 44,
  /* Zeitlicher Abstand der Porträt-Notizen */
  photoNoteDelay: 650,
  /* Scrollweg pro Steckbrief-Karte
     Kleinerer Wert = schnellerer Wechsel */
  factScrollStep: 190,
  /* Scrollweg pro Webdesign-Gerät */
  deviceScrollStep: 230,
  /* Geschwindigkeit der automatisch
     scrollenden Website-Screenshots */
  screenshotSpeed: 80,
  /* Dauer der Gedankenwolken */
  cloudPopDuration: 450,
  /* Dauer eines kompletten Formwandels */
  morphDuration: 6500
};

/* ==========================================
   2. HILFSFUNKTIONEN
   ========================================== */
const $ = (selector, root = document) =>
  root.querySelector(selector);
const $$ = (selector, root = document) =>
  Array.from(root.querySelectorAll(selector));
const clamp = (number, min = 0, max = 1) =>
  Math.max(min, Math.min(max, number));
const reducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
).matches;
const scrollCallbacks = [];
function registerScroll(callback) {
  scrollCallbacks.push(callback);
}
function runScroll() {
  scrollCallbacks.forEach(callback => {
    try {
      callback();
    } catch (error) {
      console.error("Scrollanimation:", error);
    }
  });
}
let scrollFrame = null;
function requestScroll() {
  if (scrollFrame !== null) return;
  scrollFrame = requestAnimationFrame(() => {
    scrollFrame = null;
    runScroll();
  });
}
function animate(element, frames, options = {}) {
  if (!element || reducedMotion) return null;
  return element.animate(frames, {
    duration: 700,
    easing: "cubic-bezier(.22,1,.36,1)",
    fill: "both",
    ...options
  });
}
function elementVisible(element) {
  if (!element) return false;
  const rect = element.getBoundingClientRect();
  return (
    rect.bottom > 0 &&
    rect.top < innerHeight
  );
}
function scrollPosition(section, sticky) {
  const rect = section.getBoundingClientRect();
  const topOffset =
    parseFloat(
      getComputedStyle(sticky).top
    ) || 0;
  const distance = Math.max(
    1,
    section.offsetHeight - sticky.offsetHeight
  );
  return clamp(
    (topOffset - rect.top) / distance
  );
}

/* ==========================================
   3. NAVIGATION
   ========================================== */
function setupNavigation() {
  const toggle = $(".menu-toggle");
  const links = $("#nav-links");
  toggle.addEventListener("click", () => {
    const opened = links.classList.toggle("open");
    toggle.setAttribute(
      "aria-expanded",
      String(opened)
    );
  });
  $$(".nav-links a").forEach(link => {
    link.addEventListener("click", () => {
      links.classList.remove("open");
      toggle.setAttribute(
        "aria-expanded",
        "false"
      );
    });
  });
}

/* ==========================================
   4. HERO – WORTE ERSCHEINEN
   ========================================== */
function setupHero() {
  const words = $$(".hero-title > span, .hero-title > em");
  words.forEach((word, index) => {
    animate(
      word,
      [
        {
          opacity: 0,
          transform: "translateY(35px)"
        },
        {
          opacity: 1,
          transform: "translateY(0)"
        }
      ],
      {
        duration: 950,
        delay: index * 350
      }
    );
  });
  const mind = $(".hero-title em");
  if (mind && !reducedMotion) {
    const faces = ['"Manrope", Arial, sans-serif', 'Georgia, serif', '"Mansory", Georgia, serif', '"Segoe Print", cursive', '"Mansory", Georgia, serif'];
    let faceIndex = 0;
    const cycle = () => {
      mind.style.fontFamily = faces[faceIndex % faces.length];
      faceIndex++;
      setTimeout(cycle, 720);
    };
    setTimeout(cycle, 900);
  }
  animate(
    mind,
    [
      {
        transform: "scale(.88)"
      },
      {
        transform: "scale(1.08)"
      },
      {
        transform: "scale(1)"
      }
    ],
    {
      duration: 1250,
      delay: 650
    }
  );
}

/* ==========================================
   5. MARQUEE
   Keine CSS-Keyframes.
   Endlosschleife mit requestAnimationFrame.
   ========================================== */
function setupMarquee() {
  const track = $("#marquee-track");
  const originals = $$("span", track)
    .map(item => item.cloneNode(true));
  let distance = 0;
  let offset = 0;
  let lastTime = 0;
  let animationFrame = null;
  function rebuild() {
    if (animationFrame !== null) {
      cancelAnimationFrame(animationFrame);
    }
    track.replaceChildren(
      ...originals.map(item => item.cloneNode(true))
    );
    const style = getComputedStyle(track);
    const gap =
      parseFloat(style.columnGap) || 0;
    distance = track.scrollWidth + gap;
    if (distance <= 0) return;
    const repetitions =
      Math.ceil(innerWidth / distance) + 3;
    for (let i = 0; i < repetitions; i++) {
      originals.forEach(original => {
        const copy = original.cloneNode(true);
        copy.setAttribute(
          "aria-hidden",
          "true"
        );
        track.append(copy);
      });
    }
    offset %= distance;
    lastTime = 0;
    track.style.transform =
      `translate3d(${-offset}px,0,0)`;
    if (!reducedMotion) {
      animationFrame =
        requestAnimationFrame(step);
    }
  }
  function step(time) {
    if (!lastTime) lastTime = time;
    const delta = Math.min(
      .05,
      (time - lastTime) / 1000
    );
    lastTime = time;
    offset = (
      offset + SETTINGS.marqueeSpeed * delta
    ) % distance;
    track.style.transform =
      `translate3d(${-offset}px,0,0)`;
    animationFrame =
      requestAnimationFrame(step);
  }
  rebuild();
  window.addEventListener("resize", rebuild);
  document.fonts?.ready.then(rebuild);
}

/* ==========================================
   6. PORTRÄT – HANDGESCHRIEBENE NOTIZEN
   ========================================== */
function setupPortraitNotes() {
  const photo = $("#about-photo");
  const notes = $$(".photo-note", photo);
  let animations = [];
  let started = false;
  function reset() {
    animations.forEach(animation => {
      animation?.cancel();
    });
    animations = [];
    started = false;
    notes.forEach(note => {
      note.style.opacity = "0";
      note.style.transform = "";
    });
  }
  const observer = new IntersectionObserver(entries => {
    if (!entries[0].isIntersecting) {
      reset();
      return;
    }
    if (started) return;
    started = true;
    notes.forEach((note, index) => {
      if (reducedMotion) {
        note.style.opacity = "1";
        return;
      }
      const delay =
        300 + index * SETTINGS.photoNoteDelay;
      const entrance = animate(
        note,
        [
          {
            opacity: 0,
            transform: "translateY(15px) scale(.9)"
          },
          {
            opacity: 1,
            transform: "translateY(0) scale(1)"
          }
        ],
        {
          duration: 650,
          delay
        }
      );
      animations.push(entrance);
      $$("path", note).forEach(path => {
        const length = path.getTotalLength();
        path.style.strokeDasharray = length;
        animations.push(
          animate(
            path,
            [
              { strokeDashoffset: length },
              { strokeDashoffset: 0 }
            ],
            {
              duration: 700,
              delay: delay + 250
            }
          )
        );
      });
    });
  }, {
    threshold: .35
  });
  observer.observe(photo);
}

/* ==========================================
   7. STECKBRIEF – INHALTE
   ========================================== */
const FACTS = [
  {
    label: "Meine Ausbildung",
    title: "Mediengestaltung.",
    description:
      "Seit 2024 mache ich meine Ausbildung " +
      "zur Mediengestalterin Digital und Print.",
    scene: "brush"
  },
  {
    label: "Meine Leidenschaft",
    title: "Webdesign.",
    description:
      "Ich liebe die Verbindung aus " +
      "Gestaltung, Code und kreativen Ideen.",
    scene: "code"
  },
  {
    label: "Mein Begleiter",
    title: "Balu.",
    description:
      "Balu gehört zu meinem Leben. " +
      "Ich liebe Tiere und verbringe " +
      "gerne Zeit mit ihm.",
    scene: "dog"
  },
  {
    label: "Meine kleinen Schwächen",
    title: "Bücher & Schuhe.",
    description:
      "Ein gutes Buch und ein schönes " +
      "Paar Schuhe können mich immer begeistern.",
    scene: "books"
  },
  {
    label: "Mein Ausgleich",
    title: "Yoga & Tanzen.",
    description:
      "Beim Yoga finde ich Ruhe. " +
      "Beim Tanzen kann ich mich " +
      "richtig ausleben.",
    scene: "people"
  }
];
let factSceneAnimations = [];
let factSceneVersion = 0;
function clearFactScene() {
  factSceneVersion++;
  factSceneAnimations.forEach(animation => {
    animation?.cancel();
  });
  factSceneAnimations = [];
}
function factAnimate(element, frames, options) {
  const animation = animate(
    element,
    frames,
    options
  );
  if (animation) {
    factSceneAnimations.push(animation);
  }
  return animation;
}

/* ==========================================
   8. PINSEL – WIRKLICHE PINSELSPITZE
   ========================================== */
function drawBrush(root) {
  root.innerHTML = `
    <div class="brush-scene">
      <svg class="brush-svg"
           viewBox="0 0 430 280">
        <!-- Gemalter, weicher Farbstrich -->
        <path
          id="painted-stroke"
          class="paint-line"
          d="
            M55 180
            C105 135 168 210 228 164
            S330 140 372 174
          "
        />
        <!-- Pinsel mit Holzgriff, Zwinge
             und weichen Borsten -->
        <g id="moving-brush">
          <path
            d="M-8 -111
               Q-8 -122 0 -125
               Q8 -122 8 -111
               L8 -37 L-8 -37 Z"
            fill="#A97B56"
          />
          <rect
            x="-9"
            y="-40"
            width="18"
            height="22"
            rx="3"
            fill="#C3A797"
          />
          <path
            d="
              M-9 -20
              Q-12 -2 -5 18
              Q0 31 5 18
              Q12 -2 9 -20 Z
            "
            fill="#765044"
          />
          <path
            d="M-4 -14 Q-8 3 -3 16"
            fill="none"
            stroke="#B38B71"
            stroke-width="2"
          />
          <path
            d="M2 -14 Q7 4 3 19"
            fill="none"
            stroke="#B38B71"
            stroke-width="2"
          />
        </g>
      </svg>
    </div>
  `;
  const line = $("#painted-stroke", root);
  const brush = $("#moving-brush", root);
  const length = line.getTotalLength();
  line.style.strokeDasharray = length;
  line.style.strokeDashoffset = length;
  factAnimate(
    line,
    [
      { strokeDashoffset: length },
      { strokeDashoffset: 0 }
    ],
    {
      duration: 2450,
      delay: 300,
      easing: "linear"
    }
  );
  /* Pinsel folgt der SVG-Kurve.
     Dadurch wird sichtbar gemalt. */
  if (!reducedMotion) {
    const version = factSceneVersion;
    const start = performance.now() + 300;
    function move(time) {
      if (version !== factSceneVersion) return;
      const progress = clamp(
        (time - start) / 2450
      );
      const point =
        line.getPointAtLength(length * progress);
      const next =
        line.getPointAtLength(
          Math.min(length, length * progress + 1)
        );
      const angle =
        Math.atan2(
          next.y - point.y,
          next.x - point.x
        ) * 180 / Math.PI;
      brush.setAttribute(
        "transform",
        `translate(${point.x} ${point.y}) ` +
        `rotate(${angle - 80})`
      );
      if (progress < 1) {
        requestAnimationFrame(move);
      }
    }
    requestAnimationFrame(move);
  } else {
    line.style.strokeDashoffset = 0;
    brush.setAttribute(
      "transform",
      "translate(372 174)"
    );
  }
}

/* ==========================================
   9. CODE – WIRD GETIPPT
   ========================================== */
function drawCode(root) {
  const version = factSceneVersion;
  root.innerHTML = `
    <div class="code-window">
      <span></span>
      <span></span>
      <span></span>
      <span></span>
    </div>
  `;
  const lines = [
    '<section class="creative">',
    '  <h1>MindDesign</h1>',
    '  <p>Design with Personality</p>',
    '</section>'
  ];
  const elements = $$("span", root);
  if (reducedMotion) {
    elements.forEach((element, index) => {
      element.textContent = lines[index];
    });
    return;
  }
  let row = 0;
  let character = 0;
  function type() {
    if (version !== factSceneVersion) return;
    if (row >= lines.length) return;
    character++;
    elements[row].textContent =
      lines[row].slice(0, character);
    if (character >= lines[row].length) {
      row++;
      character = 0;
    }
    if (row < lines.length) {
      setTimeout(type, 43);
    }
  }
  type();
}

/* ==========================================
   10. BALU – SÜSSER LAUFENDER HUND
   ========================================== */
function drawDog(root) {
  root.innerHTML = `
    <svg class="dog-svg"
         viewBox="0 0 430 260">
      <g id="dog-walk">
        <!-- Schwanz -->
        <g id="dog-tail">
          <path
            d="M90 130 Q47 106 54 75"
            fill="none"
            stroke="#987057"
            stroke-width="17"
            stroke-linecap="round"
          />
        </g>
        <!-- Hinterbeine -->
        <g id="dog-back-legs">
          <path
            d="M113 157 L105 212"
            stroke="#987057"
            stroke-width="21"
            stroke-linecap="round"
          />
          <path
            d="M142 157 L150 213"
            stroke="#C5A082"
            stroke-width="21"
            stroke-linecap="round"
          />
        </g>
        <!-- Körper -->
        <ellipse
          cx="160" cy="133"
          rx="84" ry="51"
          fill="#BC947A"
        />
        <ellipse
          cx="218" cy="141"
          rx="28" ry="40"
          fill="#E7C6A8"
        />
        <!-- Vorderbeine -->
        <g id="dog-front-legs">
          <path
            d="M196 163 L189 214"
            stroke="#A87E64"
            stroke-width="21"
            stroke-linecap="round"
          />
          <path
            d="M222 160 L234 214"
            stroke="#C5A082"
            stroke-width="21"
            stroke-linecap="round"
          />
        </g>
        <!-- Kopf -->
        <ellipse
          cx="235" cy="96"
          rx="43" ry="47"
          fill="#CBA488"
        />
        <!-- Schlappohr -->
        <g id="dog-ear">
          <ellipse
            cx="210" cy="85"
            rx="20" ry="33"
            fill="#906954"
          />
        </g>
        <!-- Schnauze -->
        <ellipse
          cx="267" cy="115"
          rx="31" ry="21"
          fill="#E5C4AA"
        />
        <circle
          cx="293" cy="113"
          r="7"
          fill="#49352C"
        />
        <circle
          cx="248" cy="85"
          r="5"
          fill="#49352C"
        />
        <path
          d="M270 127 Q279 134 287 125"
          fill="none"
          stroke="#76594E"
          stroke-width="2"
          stroke-linecap="round"
        />
      </g>
    </svg>
  `;
  factAnimate(
    $("#dog-walk", root),
    [
      { transform: "translateX(-125px)" },
      { transform: "translateX(120px)" }
    ],
    {
      duration: 5100,
      iterations: Infinity,
      direction: "alternate",
      easing: "ease-in-out"
    }
  );
  factAnimate(
    $("#dog-front-legs", root),
    [
      {
        transform: "rotate(-13deg)",
        transformOrigin: "210px 160px"
      },
      {
        transform: "rotate(15deg)",
        transformOrigin: "210px 160px"
      }
    ],
    {
      duration: 340,
      iterations: Infinity,
      direction: "alternate"
    }
  );
  factAnimate(
    $("#dog-back-legs", root),
    [
      {
        transform: "rotate(14deg)",
        transformOrigin: "130px 160px"
      },
      {
        transform: "rotate(-14deg)",
        transformOrigin: "130px 160px"
      }
    ],
    {
      duration: 340,
      iterations: Infinity,
      direction: "alternate"
    }
  );
  factAnimate(
    $("#dog-tail", root),
    [
      {
        transform: "rotate(-18deg)",
        transformOrigin: "90px 130px"
      },
      {
        transform: "rotate(19deg)",
        transformOrigin: "90px 130px"
      }
    ],
    {
      duration: 270,
      iterations: Infinity,
      direction: "alternate"
    }
  );
  factAnimate(
    $("#dog-ear", root),
    [
      {
        transform: "rotate(-8deg)",
        transformOrigin: "210px 65px"
      },
      {
        transform: "rotate(10deg)",
        transformOrigin: "210px 65px"
      }
    ],
    {
      duration: 370,
      iterations: Infinity,
      direction: "alternate"
    }
  );
}

/* ==========================================
   11. BÜCHER & SCHUHE
   Ein aufgeklapptes Buch blättert.
   Zwei Schuhe kommen von rechts dazu.
   Keine Einkaufstüten.
   ========================================== */
function drawBooks(root) {
  root.innerHTML = `
    <div class="book-scene">
      <svg class="book-svg"
           viewBox="0 0 440 280">
        <!-- Bodenlinie -->
        <path
          d="M20 240 H420"
          stroke="#CDA799"
          stroke-width="2"
          opacity=".6"
        />
        <!-- Aufgeschlagenes Buch -->
        <g id="open-book">
          <!-- Schatten -->
          <ellipse
            cx="148" cy="218"
            rx="112" ry="12"
            fill="#D7B9A8"
            opacity=".45"
          />
          <!-- Bucheinband -->
          <path
            d="
              M47 132
              Q103 119 148 142
              Q193 119 249 132
              L249 207
              Q193 194 148 219
              Q103 194 47 207 Z
            "
            fill="#AE766C"
          />
          <!-- Linke Seite -->
          <path
            d="
              M54 130
              Q102 119 148 143
              L148 210
              Q100 187 54 199 Z
            "
            fill="#F9EEE2"
          />
          <!-- Rechte Seite -->
          <path
            d="
              M148 143
              Q193 119 242 130
              L242 199
              Q190 188 148 210 Z
            "
            fill="#F4E4D5"
          />
          <!-- Einzelne blätternde Seiten -->
          <g id="turning-page">
            <path
              d="
                M148 143
                Q194 123 239 134
                L239 194
                Q195 186 148 210 Z
              "
              fill="#FFF9F0"
              stroke="#E1C5B6"
              stroke-width="1"
            />
            <path
              d="M160 155 Q195 144 227 151
                 M160 168 Q194 157 227 164
                 M160 181 Q194 170 227 176"
              stroke="#D6B7A7"
              fill="none"
              stroke-width="1.6"
            />
          </g>
          <!-- Buchfalz -->
          <path
            d="M148 141 L148 216"
            fill="none"
            stroke="#BC9080"
            stroke-width="2"
          />
        </g>
        <!-- Zwei Schuhe auf dem Boden -->
        <g id="walking-shoes">
          <!-- Hinterer Schuh -->
          <g id="shoe-back"
             transform="translate(0 -5)">
            <path
              d="
                M299 196
                Q309 180 321 179
                L330 193
                Q347 211 369 216
                Q382 219 379 234
                L289 234
                Q284 213 299 196 Z
              "
              fill="#B98178"
            />
            <path
              d="M289 234 H379"
              stroke="#FFF9F3"
              stroke-width="7"
              stroke-linecap="round"
            />
            <path
              d="M311 199 L332 201
                 M307 205 L336 207"
              stroke="#F6E6D8"
              stroke-width="2"
            />
          </g>
          <!-- Vorderer Schuh -->
          <g id="shoe-front">
            <path
              d="
                M318 192
                Q328 176 340 176
                L349 191
                Q363 207 390 213
                Q407 217 404 234
                L309 234
                Q305 210 318 192 Z
              "
              fill="#D1A89A"
            />
            <path
              d="M309 234 H404"
              stroke="#FFF9F3"
              stroke-width="7"
              stroke-linecap="round"
            />
            <path
              d="M331 196 L350 198
                 M326 202 L355 204"
              stroke="#F6E6D8"
              stroke-width="2"
            />
          </g>
        </g>
      </svg>
    </div>
  `;
  const page = $("#turning-page", root);
  const shoes = $("#walking-shoes", root);
  /* Buchseiten wiederholt umblättern */
  factAnimate(
    page,
    [
      {
        transform: "scaleX(1)",
        transformOrigin: "148px 170px"
      },
      {
        transform: "scaleX(-.85)",
        transformOrigin: "148px 170px"
      },
      {
        transform: "scaleX(1)",
        transformOrigin: "148px 170px"
      }
    ],
    {
      duration: 2800,
      iterations: Infinity,
      easing: "ease-in-out"
    }
  );
  /* Schuhe kommen zum Buch gelaufen */
  factAnimate(
    shoes,
    [
      {
        transform: "translateX(165px)",
        opacity: 0
      },
      {
        transform: "translateX(110px)",
        opacity: 1
      },
      {
        transform: "translateX(52px)"
      },
      {
        transform: "translateX(0)"
      }
    ],
    {
      duration: 3000,
      delay: 400
    }
  );
  ["shoe-front", "shoe-back"].forEach(
    (id, index) => {
      factAnimate(
        $("#" + id, root),
        [
          { transform: "translateY(0)" },
          { transform: "translateY(-16px)" },
          { transform: "translateY(0)" }
        ],
        {
          duration: 700,
          delay: index * 350,
          iterations: Infinity
        }
      );
    }
  );
}

/* ==========================================
   12. YOGA & TANZEN
   Zwei gleich gestaltete Frauen.
   Gleiche Haare, Kleidung und Proportionen.
   Unterschiedlich ist nur ihre Bewegung.
   ========================================== */
function characterSVG(name) {
  return `
    <svg viewBox="0 0 190 280"
         aria-hidden="true">
      <g id="${name}-character">
        <!-- Haare hinter dem Kopf -->
        <path
          d="
            M75 35
            Q61 10 94 8
            Q129 8 129 40
            L136 100
            Q123 115 114 97
            L69 96
            Q58 89 65 65 Z
          "
          class="person-hair"
        />
        <!-- Beine -->
        <g id="${name}-left-leg">
          <path
            d="M87 163 L67 223 L62 255"
            class="person-limb"
          />
          <path
            d="M44 252 Q63 246 74 256
               L74 263 L42 263 Z"
            class="person-shoe"
          />
        </g>
        <g id="${name}-right-leg">
          <path
            d="M103 163 L122 223 L128 255"
            class="person-limb"
          />
          <path
            d="M113 254 Q133 245 144 257
               L144 263 L112 263 Z"
            class="person-shoe"
          />
        </g>
        <!-- Hose -->
        <path
          d="
            M76 142
            L114 142
            L119 171
            L108 199
            L96 194
            L87 199
            L70 171 Z
          "
          class="person-outfit"
        />
        <!-- Körper / Shirt -->
        <path
          d="
            M77 79
            Q95 73 113 79
            L119 145
            Q95 158 70 145 Z
          "
          class="person-body"
        />
        <!-- Arme -->
        <g id="${name}-left-arm">
          <path
            d="M77 88 L54 130 L45 151"
            class="person-limb"
          />
        </g>
        <g id="${name}-right-arm">
          <path
            d="M112 88 L136 128 L147 149"
            class="person-limb"
          />
        </g>
        <!-- Hals -->
        <rect
          x="89" y="66"
          width="12" height="17"
          rx="6"
          class="person-skin"
        />
        <!-- Gesicht -->
        <ellipse
          cx="95" cy="48"
          rx="24" ry="30"
          class="person-skin"
        />
        <!-- Haaransatz -->
        <path
          d="
            M72 39
            Q78 12 105 18
            Q120 22 121 39
            Q105 36 96 25
            Q89 38 72 39 Z
          "
          class="person-hair"
        />
        <!-- Augen -->
        <path
          d="M82 49 Q87 53 91 49
             M102 49 Q106 53 110 49"
          fill="none"
          stroke="#765044"
          stroke-width="1.7"
          stroke-linecap="round"
        />
        <!-- Lächeln -->
        <path
          d="M90 61 Q95 65 101 61"
          fill="none"
          stroke="#A96F68"
          stroke-width="1.6"
          stroke-linecap="round"
        />
      </g>
      <text
        x="95"
        y="276"
        text-anchor="middle"
        fill="#76594E"
        font-family="Manrope, sans-serif"
        font-size="12"
      >
        ${name === "yoga" ? "Yoga" : "Tanzen"}
      </text>
    </svg>
  `;
}
function drawPeople(root) {
  root.innerHTML = `
    <div class="person-stage">
      ${characterSVG("yoga")}
      ${characterSVG("dance")}
    </div>
  `;
  function move(id, frames, duration, delay = 0) {
    const element = $("#" + id, root);
    factAnimate(
      element,
      frames,
      {
        duration,
        delay,
        iterations: Infinity,
        direction: "alternate",
        easing: "ease-in-out"
      }
    );
  }
  /* ========================================
     YOGA
     Langsame Haltung:
     Arme heben sich, Körper neigt sich,
     ein Bein kommt in Balance.
     ======================================== */
  move(
    "yoga-character",
    [
      {
        transform: "translateY(0) rotate(0)",
        transformOrigin: "95px 160px"
      },
      {
        transform: "translateY(-8px) rotate(5deg)",
        transformOrigin: "95px 160px"
      }
    ],
    3400
  );
  move(
    "yoga-left-arm",
    [
      {
        transform: "rotate(0)",
        transformOrigin: "77px 88px"
      },
      {
        transform: "rotate(145deg)",
        transformOrigin: "77px 88px"
      }
    ],
    3100
  );
  move(
    "yoga-right-arm",
    [
      {
        transform: "rotate(0)",
        transformOrigin: "112px 88px"
      },
      {
        transform: "rotate(-145deg)",
        transformOrigin: "112px 88px"
      }
    ],
    3100
  );
  move(
    "yoga-right-leg",
    [
      {
        transform: "rotate(0)",
        transformOrigin: "103px 163px"
      },
      {
        transform: "rotate(-52deg)",
        transformOrigin: "103px 163px"
      }
    ],
    3400
  );
  /* ========================================
     TANZEN
     Dieselbe Figur:
     Rhythmische Seitbewegung,
     Hüftbewegung, Arme und Schritte.
     ======================================== */
  move(
    "dance-character",
    [
      {
        transform:
          "translate(-10px,0) rotate(-7deg)",
        transformOrigin: "95px 150px"
      },
      {
        transform:
          "translate(10px,-8px) rotate(7deg)",
        transformOrigin: "95px 150px"
      }
    ],
    800
  );
  move(
    "dance-left-arm",
    [
      {
        transform: "rotate(-42deg)",
        transformOrigin: "77px 88px"
      },
      {
        transform: "rotate(105deg)",
        transformOrigin: "77px 88px"
      }
    ],
    760
  );
  move(
    "dance-right-arm",
    [
      {
        transform: "rotate(100deg)",
        transformOrigin: "112px 88px"
      },
      {
        transform: "rotate(-55deg)",
        transformOrigin: "112px 88px"
      }
    ],
    680
  );
  move(
    "dance-left-leg",
    [
      {
        transform: "rotate(-22deg)",
        transformOrigin: "87px 163px"
      },
      {
        transform: "rotate(26deg)",
        transformOrigin: "87px 163px"
      }
    ],
    720
  );
  move(
    "dance-right-leg",
    [
      {
        transform: "rotate(28deg)",
        transformOrigin: "103px 163px"
      },
      {
        transform: "rotate(-23deg)",
        transformOrigin: "103px 163px"
      }
    ],
    720,
    170
  );
}

/* ==========================================
   13. STECKBRIEF – SCROLLWECHSEL
   ========================================== */
function setupFacts() {
  const section = $("#facts-scroll");
  const sticky = $("#facts-sticky");
  const art = $("#fact-art");
  let current = -1;
  const scenes = {
    brush: drawBrush,
    code: drawCode,
    dog: drawDog,
    books: drawBooks,
    people: drawPeople
  };
  function measure() {
    section.style.height =
      (
        sticky.offsetHeight +
        SETTINGS.factScrollStep * FACTS.length
      ) + "px";
  }
  function show(index) {
    if (index === current) return;
    current = index;
    clearFactScene();
    art.replaceChildren();
    const fact = FACTS[index];
    $("#fact-label").textContent =
      fact.label;
    $("#fact-title").textContent =
      fact.title;
    $("#fact-description").textContent =
      fact.description;
    $("#fact-progress").style.width =
      `${(index + 1) / FACTS.length * 100}%`;
    scenes[fact.scene](art);
    animate(
      $("#fact-copy"),
      [
        {
          opacity: .25,
          transform: "translateY(16px)"
        },
        {
          opacity: 1,
          transform: "translateY(0)"
        }
      ],
      {
        duration: 450
      }
    );
  }
  registerScroll(() => {
    if (!elementVisible(sticky)) {
      if (current !== -1) {
        current = -1;
        clearFactScene();
        art.replaceChildren();
      }
      return;
    }
    const progress =
      scrollPosition(section, sticky);
    const index = Math.min(
      FACTS.length - 1,
      Math.floor(progress * FACTS.length)
    );
    show(index);
  });
  window.addEventListener("resize", measure);
  measure();
}

/* ==========================================
   14. MEIN WEG – WELLE ZEICHNEN
   ========================================== */
function setupJourney() {
  const section = $("#journey");
  const items = $$(".journey-item");
  const path = $("#wave-animated");
  const length = path.getTotalLength();
  path.style.strokeDasharray = length;
  path.style.strokeDashoffset = length;
  registerScroll(() => {
    const rect = section.getBoundingClientRect();
    const progress = clamp(
      (innerHeight * .65 - rect.top) /
      Math.max(1, rect.height)
    );
    path.style.strokeDashoffset =
      length * (1 - progress);
    let best = 0;
    let bestDistance = Infinity;
    items.forEach((item, index) => {
      const box = item.getBoundingClientRect();
      const distance = Math.abs(
        box.top + box.height / 2 -
        innerHeight * .5
      );
      if (distance < bestDistance) {
        bestDistance = distance;
        best = index;
      }
    });
    items.forEach((item, index) => {
      item.style.opacity =
        index === best ? "1" : ".52";
    });
  });
}

/* ==========================================
   15. MIND. IDEAS. INDIVIDUALITY.
   Langsamerer Bewegungsablauf,
   aber früher abgeschlossen.
   ========================================== */
function setupStatement() {
  const section = $("#statement");
  const title = section ? $(".statement-title", section) : null;
  const words = section ? $$(".statement-title span", section) : [];
  if (!section || !title || !words.length) return;

  const base = [232, 220, 206];
  const rose = [189, 129, 120];
  const ease = n => n * n * (3 - 2 * n);
  const mix = (a, b, p) => Math.round(a + (b - a) * p);

  registerScroll(() => {
    const rect = section.getBoundingClientRect();
    const viewport = window.innerHeight;

    // Timeline measured against viewport, not the whole section height:
    // all three words and the final white glow are visible while sticky.
    // About 1.7 viewport heights of scrolling for the whole sequence.
    const progress = clamp((viewport * .72 - rect.top) / (viewport * 1.70));
    const directions = [[-170, 0], [170, 0], [0, 135]];

    words.forEach((word, index) => {
      const arrival = reducedMotion ? 1 : ease(clamp((progress - index * .105) / .43));
      const [x, y] = directions[index] || [0, 0];
      word.style.opacity = String(.12 + .88 * arrival);
      word.style.transform = `translate3d(${x * (1 - arrival)}px,${y * (1 - arrival)}px,0)`;
    });

    // Background starts after all words have arrived, while still centered.
    const color = ease(clamp((progress - .70) / .16));
    section.style.backgroundColor =
      `rgb(${base.map((value, i) => mix(value, rose[i], color)).join(",")})`;

    const white = ease(clamp((progress - .72) / .16));
    title.style.color =
      `rgb(${mix(73, 255, white)},${mix(53, 255, white)},${mix(44, 255, white)})`;

    const glow = Math.max(0, Math.sin(Math.PI * clamp((progress - .72) / .25)));
    title.style.textShadow = white > 0
      ? `0 0 ${Math.round(20 * glow)}px rgba(255,255,255,${(.42 * glow).toFixed(2)})`
      : "none";
  });
}

/* ==========================================
   16. GEDANKENWOLKE
   Klein → mittel → groß.
   ========================================== */
function cloudMarkup() {
  return `
    <div class="thought-group">
      <svg viewBox="0 0 220 190">
        <!-- Kleines Bläschen -->
        <g class="thought-part cloud-small"
           fill="#D1A89A">
          <circle cx="38" cy="174" r="9"/>
        </g>
        <!-- Mittleres Bläschen -->
        <g class="thought-part cloud-medium"
           fill="#D1A89A">
          <circle cx="63" cy="148" r="15"/>
        </g>
        <!-- Große, weiche Traumwolke -->
        <g class="thought-part cloud-large"
           fill="#D1A89A">
          <circle cx="56" cy="75" r="34"/>
          <circle cx="93" cy="53" r="43"/>
          <circle cx="137" cy="52" r="41"/>
          <circle cx="172" cy="78" r="36"/>
          <circle cx="138" cy="108" r="39"/>
          <circle cx="89" cy="109" r="40"/>
          <circle cx="39" cy="106" r="24"/>
        </g>
      </svg>
    </div>
  `;
}

/* ==========================================
   17. FARBSPRITZER
   Unregelmäßige Spritzer + Tropfen.
   ========================================== */
function splashMarkup() {
  return `
    <svg class="paint-splash"
         viewBox="0 0 240 240">
      <g fill="currentColor">
        <path d="
          M122 37
          C135 50 146 33 150 16
          C156 0 163 11 159 31
          C157 54 169 67 184 51
          C200 34 208 43 192 62
          C180 77 177 91 195 95
          C216 100 233 88 237 105
          C241 120 211 119 193 119
          C175 121 173 132 185 149
          C207 177 194 190 174 170
          C158 153 150 171 147 196
          C145 230 126 234 124 204
          C123 184 112 171 98 190
          C79 216 63 206 78 177
          C92 151 65 154 41 165
          C15 179 12 159 36 146
          C65 129 65 112 35 112
          C2 112 9 93 40 96
          C62 98 76 89 61 67
          C43 43 55 31 76 50
          C92 66 107 54 103 35
          C99 7 116 9 122 37 Z
        "/>
        <circle cx="18" cy="70" r="8"/>
        <circle cx="214" cy="73" r="8"/>
        <circle cx="57" cy="216" r="6"/>
        <ellipse
          cx="193" cy="206"
          rx="8" ry="13"
          transform="rotate(20 193 206)"
        />
        <ellipse
          cx="16" cy="145"
          rx="5" ry="11"
        />
        <ellipse
          cx="187" cy="16"
          rx="5" ry="10"
        />
      </g>
    </svg>
  `;
}

/* ==========================================
   18. MORPHING
   ========================================== */
const MORPH_STATES = [
  {
    radius: "50% 50% 50% 50%",
    scaleX: 1,
    scaleY: 1,
    rotate: 0
  },
  {
    radius: "42% 58% 60% 40%",
    scaleX: 1.1,
    scaleY: .93,
    rotate: 12
  },
  {
    radius: "50% 50% 50% 50%",
    scaleX: 1.38,
    scaleY: .78,
    rotate: 0
  },
  {
    radius: "33% 67% 54% 46%",
    scaleX: 1.16,
    scaleY: 1.04,
    rotate: -10
  }
];

/* ==========================================
   19. ENTSTEHUNG VON MINDDESIGN
   ========================================== */
function setupStory() {
  const section = $("#story");
  const steps = $$(".story-step");
  const scenes = [
    $("#scene-clouds"),
    $("#scene-fonts"),
    $("#scene-splashes"),
    $("#scene-morph"),
    $("#scene-logo")
  ];
  let active = -1;
  let animations = [];
  let morphStart = performance.now();
  function clearAnimations() {
    animations.forEach(animation => {
      animation?.cancel();
    });
    animations = [];
  }
  function sceneAnimate(element, frames, options) {
    const animation = animate(
      element,
      frames,
      options
    );
    if (animation) {
      animations.push(animation);
    }
  }
  /* Drei Wolken mit größerem Abstand */
  function showClouds() {
    const scene = $("#scene-clouds");
    scene.replaceChildren();
    const positions = [
      { x: 3, y: 6, scale: .78 },
      { x: 59, y: 14, scale: .75 },
      { x: 29, y: 57, scale: .65 }
    ];
    positions.forEach((position, index) => {
      const template =
        document.createElement("div");
      template.innerHTML = cloudMarkup();
      const cloud = template.firstElementChild;
      cloud.style.left = position.x + "%";
      cloud.style.top = position.y + "%";
      scene.append(cloud);
      const parts = [
        $(".cloud-small", cloud),
        $(".cloud-medium", cloud),
        $(".cloud-large", cloud)
      ];
      parts.forEach((part, partIndex) => {
        sceneAnimate(
          part,
          [
            {
              opacity: 0,
              transform: "scale(.08)"
            },
            {
              opacity: 1,
              transform: "scale(1.15)"
            },
            {
              opacity: 1,
              transform: "scale(1)"
            }
          ],
          {
            duration:
              SETTINGS.cloudPopDuration,
            delay:
              index * 1100 +
              partIndex * 330
          }
        );
      });
      sceneAnimate(
        cloud,
        [
          {
            transform:
              `scale(${position.scale}) translateY(0)`
          },
          {
            transform:
              `scale(${position.scale}) translateY(-8px)`
          }
        ],
        {
          duration: 3100,
          iterations: Infinity,
          direction: "alternate"
        }
      );
    });
  }
  /* Schrift schreibt sich nacheinander */
  function showFonts() {
    $$(".font-line").forEach((line, index) => {
      sceneAnimate(
        line,
        [
          {
            clipPath: "inset(0 100% 0 0)"
          },
          {
            clipPath: "inset(0 0 0 0)"
          }
        ],
        {
          duration: 1350,
          delay: index * 470,
          easing: "steps(18,end)"
        }
      );
    });
  }
  /* Farbspritzer */
  function showSplashes() {
    const scene = $("#scene-splashes");
    scene.replaceChildren();
    const splashes = [
      [8, 12, .88, "#BD8178"],
      [57, 8, .75, "#D1A89A"],
      [27, 43, .82, "#E6BCAD"],
      [63, 56, .57, "#B98779"],
      [6, 61, .4, "#D6A397"]
    ];
    splashes.forEach(
      ([x, y, scale, color], index) => {
        const template =
          document.createElement("div");
        template.innerHTML = splashMarkup();
        const splash = template.firstElementChild;
        splash.style.left = x + "%";
        splash.style.top = y + "%";
        splash.style.color = color;
        scene.append(splash);
        sceneAnimate(
          splash,
          [
            {
              opacity: 0,
              transform:
                "scale(.05) rotate(-35deg)"
            },
            {
              opacity: 1,
              transform:
                `scale(${scale * 1.12}) rotate(7deg)`
            },
            {
              opacity: 1,
              transform:
                `scale(${scale}) rotate(0deg)`
            }
          ],
          {
            duration: 750,
            delay: index * 290
          }
        );
      }
    );
  }
  /* Originales Logo */
  function showLogo() {
    sceneAnimate(
      $(".final-logo"),
      [
        {
          opacity: 0,
          transform: "scale(.78)"
        },
        {
          opacity: 1,
          transform: "scale(1)"
        }
      ],
      {
        duration: 1150
      }
    );
  }
  function changeScene(index) {
    if (index === active) return;
    active = index;
    clearAnimations();
    scenes.forEach((scene, i) => {
      scene.classList.toggle(
        "active",
        i === index
      );
    });
    steps.forEach((step, i) => {
      step.style.opacity =
        i === index ? "1" : ".5";
    });
    if (index === 0) showClouds();
    if (index === 1) showFonts();
    if (index === 2) showSplashes();
    if (index === 3) {
      morphStart = performance.now();
    }
    if (index === 4) showLogo();
  }
  registerScroll(() => {
    if (!elementVisible(section)) return;
    let best = 0;
    let bestDistance = Infinity;
    steps.forEach((step, index) => {
      const rect = step.getBoundingClientRect();
      const distance = Math.abs(
        rect.top + rect.height / 2 -
        innerHeight * .5
      );
      if (distance < bestDistance) {
        bestDistance = distance;
        best = index;
      }
    });
    changeScene(best);
  });
  /* Form wandelt sich auch ohne Scrollen */
  function morphLoop(time) {
    const shape = $("#morph-shape");
    if (active === 3 && !reducedMotion) {
      const elapsed = time - morphStart;
      const phase =
        (elapsed / SETTINGS.morphDuration) % 2;
      const progress =
        phase <= 1 ? phase : 2 - phase;
      const stateIndex = Math.min(
        2,
        Math.floor(progress * 3)
      );
      const from = MORPH_STATES[stateIndex];
      const to = MORPH_STATES[stateIndex + 1];
      const amount =
        progress * 3 - stateIndex;
      const mix = (a, b) =>
        a + (b - a) * amount;
      /* Verschiedene Radien erzeugen
         die organische Form. */
      const radiusValues = [
        [50, 50, 50, 50],
        [42, 58, 60, 40],
        [50, 50, 50, 50],
        [33, 67, 54, 46]
      ];
      const radius = radiusValues[stateIndex]
        .map((number, i) =>
          mix(
            number,
            radiusValues[stateIndex + 1][i]
          ).toFixed(1) + "%"
        );
      shape.style.borderRadius =
        radius.join(" ");
      shape.style.transform =
        `scale(` +
        `${mix(from.scaleX, to.scaleX)},` +
        `${mix(from.scaleY, to.scaleY)}` +
        `) rotate(` +
        `${mix(from.rotate, to.rotate)}deg` +
        `)`;
    }
    requestAnimationFrame(morphLoop);
  }
  requestAnimationFrame(morphLoop);
}

/* ==========================================
   20. PORTFOLIO – HORIZONTALER SCROLL
   ========================================== */
function setupPortfolio() {
  const section = $("#portfolio");
  const sticky = $("#portfolio-sticky");
  const windowElement = $(".portfolio-window", section);
  const track = $("#portfolio-track");

  let distance = 0;
  let mobileMode = false;

  // Die vorhandene CSS schaltet die Sticky-Animation auf
  // Smartphones ab. Nur dort heben wir diese Regeln per JS auf.
  // So bleiben HTML, CSS und Desktop-Verhalten unangetastet.
  function setMobileMode(enabled) {
    if (enabled === mobileMode) return;
    mobileMode = enabled;

    if (enabled) {
      section.style.setProperty("height", "auto", "important");
      sticky.style.setProperty("position", "sticky");
      sticky.style.setProperty("top", "var(--header-height)");
      sticky.style.setProperty("height", "calc(100svh - var(--header-height))");
      sticky.style.setProperty("min-height", "0");
      sticky.style.setProperty("padding-block", "0");
      windowElement.style.setProperty("overflow-x", "hidden");
      windowElement.style.setProperty("scroll-snap-type", "none");
    } else {
      section.style.removeProperty("height");
      sticky.style.removeProperty("position");
      sticky.style.removeProperty("top");
      sticky.style.removeProperty("height");
      sticky.style.removeProperty("min-height");
      sticky.style.removeProperty("padding-block");
      windowElement.style.removeProperty("overflow-x");
      windowElement.style.removeProperty("scroll-snap-type");
      track.style.removeProperty("transform");
    }
  }

  function measure() {
    setMobileMode(window.innerWidth <= 850);

    // Besonders auf Mobilgeräten die sichtbare Kartenfläche
    // statt der Gesamtbreite des Fensters als Maß verwenden.
    distance = Math.max(0, track.scrollWidth - windowElement.clientWidth);
    section.style.setProperty(
      "height",
      `${sticky.offsetHeight + distance}px`,
      mobileMode ? "important" : ""
    );

    update();
  }

  function update() {
    const rect = section.getBoundingClientRect();
    const topOffset = parseFloat(getComputedStyle(sticky).top) || 0;
    const progress = distance > 0
      ? clamp((topOffset - rect.top) / distance)
      : 0;

    // Wichtig: Mobil steht in der vorhandenen CSS
    // "transform: none !important". Darum ist hier
    // ebenfalls !important nötig.
    track.style.setProperty(
      "transform",
      `translate3d(${-progress * distance}px, 0, 0)`,
      mobileMode ? "important" : ""
    );
  }

  registerScroll(update);
  window.addEventListener("resize", measure);
  window.addEventListener("load", measure);
  document.fonts?.ready.then(measure);
  measure();
}

/* ==========================================
   21. MEINE TOOLS – VORSCHAUEN
   ========================================== */
const TOOL_PREVIEWS = {
  indesign: `
    <div class="mini-page">
      <i></i>
      <i></i>
      <i></i>
    </div>
  `,
  illustrator: `
    <div class="mini-vector"></div>
  `,
  photoshop: `
    <div class="mini-photoshop">
      <div class="ps-image"></div>
      <div class="ps-crop"></div>
    </div>
  `,
  aftereffects: `
    <div class="mini-motion">
      <i></i>
    </div>
  `,
  vscode: `
    <div class="mini-code">
      <span></span>
      <span></span>
      <span></span>
    </div>
  `,
  canva: `
    <div class="mini-canva">
      <aside>
        <i></i>
        <i></i>
        <i></i>
      </aside>
      <article>
        create<br>something.
      </article>
    </div>
  `,
  acrobat: `
    <div class="mini-pdf">
      <i></i>
      <i></i>
      <i>PDF</i>
    </div>
  `,
  word: `
    <div class="mini-word">
      <div class="word-toolbar" aria-hidden="true"><div>Datei&nbsp;&nbsp; Start&nbsp;&nbsp; Einfügen&nbsp;&nbsp; Layout</div><div>B&nbsp;&nbsp; I&nbsp;&nbsp; U&nbsp;&nbsp; A&nbsp;&nbsp; ≡&nbsp;&nbsp; •</div></div>
      <strong>
        Creative Notes.
      </strong>
      <p></p>
      <p></p>
    </div>
  `,
  excel: `
    <div class="mini-excel">
      ${Array.from(
        { length: 30 },
        () => "<i></i>"
      ).join("")}
    </div>
  `,
  powerpoint: `
    <div class="ppt-app">
      <div class="ppt-ribbon" aria-label="PowerPoint-Menü">
        <span>Datei</span><span>Start</span><span>Einfügen</span><span>Entwurf</span><span>Übergänge</span>
      </div>
      <div class="ppt-thumbs">
        <button type="button">
          Mind.
        </button>
        <button type="button">
          Ideas.
        </button>
        <button type="button">
          Individuality.
        </button>
      </div>
      <div class="ppt-main">
        Mind.
      </div>
    </div>
  `
};

/* ==========================================
   22. TOOLS – HOVER ÖFFNEN / SCHLIESSEN
   ========================================== */
function setupTools() {
  const popup = $("#tool-preview");
  const content = $("#tool-preview-content");
  let activeButton = null;
  let toolAnimations = [];
  let toolInterval = null;
  let version = 0;
  function clearPreview() {
    version++;
    toolAnimations.forEach(animation => {
      animation?.cancel();
    });
    toolAnimations = [];
    clearInterval(toolInterval);
    toolInterval = null;
  }
  function toolAnimate(element, frames, options) {
    const animation = animate(
      element,
      frames,
      options
    );
    if (animation) {
      toolAnimations.push(animation);
    }
  }
  function close() {
    clearPreview();
    activeButton = null;
    popup.hidden = true;
  }
  function open(button) {
    if (activeButton === button) return;
    clearPreview();
    activeButton = button;
    const type = button.dataset.tool;
    const token = version;
    content.innerHTML =
      TOOL_PREVIEWS[type] || "";
    $("#tool-preview-name").textContent =
      $("strong", button).textContent;
    popup.hidden = false;
    if (type === "indesign") {
      $$(".mini-page i", content)
        .forEach((element, index) => {
          toolAnimate(
            element,
            [
              {
                opacity: 0,
                transform: "translateY(22px)"
              },
              {
                opacity: 1,
                transform: "none"
              }
            ],
            {
              duration: 480,
              delay: index * 230
            }
          );
        });
    }
    if (type === "illustrator") {
      toolAnimate(
        $(".mini-vector", content),
        [
          {
            borderRadius: "50%",
            transform: "rotate(0)"
          },
          {
            borderRadius: "38% 62% 60% 40%",
            transform: "rotate(40deg)"
          }
        ],
        {
          duration: 1800,
          iterations: Infinity,
          direction: "alternate"
        }
      );
    }
    if (type === "photoshop") {
      toolAnimate(
        $(".ps-crop", content),
        [
          { inset: "23px 28px" },
          { inset: "43px 66px" },
          { inset: "23px 28px" }
        ],
        {
          duration: 2500,
          iterations: Infinity
        }
      );
      toolAnimate(
        $(".ps-image", content),
        [
          { transform: "scale(1)" },
          { transform: "scale(1.15)" },
          { transform: "scale(1)" }
        ],
        {
          duration: 2500,
          iterations: Infinity
        }
      );
    }
    if (type === "aftereffects") {
      toolAnimate(
        $(".mini-motion i", content),
        [
          { left: "10%", top: "40%" },
          { left: "78%", top: "15%" }
        ],
        {
          duration: 1800,
          iterations: Infinity,
          direction: "alternate"
        }
      );
    }
    if (type === "vscode" || type === "word") {
      const lines = type === "vscode"
        ? [
            '<section class="creative">',
            '  <h1>MindDesign</h1>',
            '</section>'
          ]
        : [
            "Meine Ideen werden sichtbar.",
            "Design with Personality."
          ];
      const elements = type === "vscode"
        ? $$(".mini-code span", content)
        : $$(".mini-word p", content);
      let row = 0;
      let pos = 0;
      toolInterval = setInterval(() => {
        if (token !== version) return;
        if (row >= lines.length) {
          clearInterval(toolInterval);
          return;
        }
        elements[row].textContent =
          lines[row].slice(0, ++pos);
        if (pos >= lines[row].length) {
          row++;
          pos = 0;
        }
      }, 52);
    }
    if (type === "canva") {
      toolAnimate(
        $(".mini-canva article", content),
        [
          {
            opacity: 0,
            transform: "scale(.7)"
          },
          {
            opacity: 1,
            transform: "scale(1)"
          }
        ],
        {
          duration: 750
        }
      );
    }
    if (type === "acrobat") {
      // Ruhiges Öffnen des PDF-Fensters statt dauerhafter 3D-Drehung.
    }
    if (type === "excel") {
      $$(".mini-excel i", content)
        .forEach((cell, index) => {
          toolAnimate(
            cell,
            [
              { opacity: 0 },
              { opacity: 1 }
            ],
            {
              duration: 260,
              delay: index * 55
            }
          );
        });
    }
    if (type === "powerpoint") {
      const slides = [
        "Mind.",
        "Ideas.",
        "Individuality."
      ];
      const buttons = $$(
        ".ppt-thumbs button",
        content
      );
      let current = 0;
      function showSlide(index) {
        current = index;
        buttons.forEach((button, i) => {
          button.classList.toggle(
            "active",
            i === index
          );
        });
        $(".ppt-main", content).textContent =
          slides[index];
      }
      buttons.forEach((button, index) => {
        button.addEventListener(
          "click",
          () => showSlide(index)
        );
      });
      showSlide(0);
      toolInterval = setInterval(() => {
        showSlide(
          (current + 1) % slides.length
        );
      }, 1700);
    }
  }
  const hasHover = matchMedia(
    "(hover:hover) and (pointer:fine)"
  );
  $$(".tool").forEach(button => {
    button.addEventListener("mouseenter", () => {
      if (hasHover.matches) open(button);
    });
    // Nicht beim Verlassen einer einzelnen Kachel schließen:
    // sonst flackert das Fenster beim Wechsel zur nächsten Kachel.
    button.addEventListener("click", () => {
      if (hasHover.matches) {
        open(button);
        return;
      }
      if (activeButton === button) {
        close();
      } else {
        open(button);
      }
    });
  });
  const toolGrid = $(".tool-grid");
  toolGrid?.addEventListener("mouseleave", () => {
    if (hasHover.matches) close();
  });
  $("#tool-preview-close").addEventListener(
    "click",
    close
  );
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      close();
    }
  });
  document.addEventListener("pointerdown", event => {
    if (popup.hidden || hasHover.matches) return;
    if (
      !popup.contains(event.target) &&
      !event.target.closest(".tool")
    ) {
      close();
    }
  });
}

/* ==========================================
   23. WEBDESIGN – ECHTE RESPONSIVE LIVE-VORSCHAU
   Die iframe-Breite simuliert den jeweiligen Bildschirm.
   ?minddesign-preview=1 verhindert rekursive Frames.
   ========================================== */
const DEVICES = [
  {category:"Desktop-Version",heading:"Großzügig gestaltet.",text:"Auf dem Desktop bekommen Bilder, Navigation und Inhalte besonders viel Raum.",className:"desktop",viewport:1440},
  {category:"Tablet-Version",heading:"Flexibel gestaltet.",text:"Auf dem Tablet passen sich Abstände, Bilder und Inhalte an den Bildschirm an.",className:"tablet",viewport:768},
  {category:"Smartphone-Version",heading:"Überall durchdacht.",text:"Auf dem Smartphone stehen Übersichtlichkeit und eine einfache Bedienung im Mittelpunkt.",className:"phone",viewport:390}
];

/* Läuft NUR in der kleinen eingebetteten Webseite.
   Die normale MindDesign-Seite wird dadurch nicht verändert. */
function setupEmbeddedPreview() {
  document.documentElement.classList.add("minddesign-preview");
  const style = document.createElement("style");
  style.textContent = `
    html.minddesign-preview {scroll-behavior:auto!important;}
    html.minddesign-preview body {overflow-x:hidden!important;}
    html.minddesign-preview .site-header {position:relative!important;inset:auto!important;}
    html.minddesign-preview .hero {margin-top:0!important;min-height:0!important;height:460px!important;}
    html.minddesign-preview .hero-content {padding:20px 14px!important;}
    html.minddesign-preview .marquee {height:75px!important;min-height:75px!important;}
    html.minddesign-preview .marquee-track {height:75px!important;animation:none!important;}
    html.minddesign-preview .marquee-track span {font-size:20px!important;}
    html.minddesign-preview .photo-note {opacity:1!important;transform:none!important;}
    html.minddesign-preview .facts-scroll,
    html.minddesign-preview .webdesign-scroll {height:auto!important;}
    html.minddesign-preview .facts-sticky,
    html.minddesign-preview .portfolio-sticky,
    html.minddesign-preview .story-visual {position:relative!important;top:auto!important;height:auto!important;min-height:0!important;}
    html.minddesign-preview .fact-art {display:none!important;}
    html.minddesign-preview .fact-card {min-height:230px!important;}
    html.minddesign-preview .journey-item,
    html.minddesign-preview .story-step {opacity:1!important;min-height:220px!important;}
    html.minddesign-preview .statement-section {min-height:340px!important;padding:45px 0!important;background:var(--rose)!important;}
    html.minddesign-preview .statement-title {position:relative!important;top:auto!important;padding:25px!important;color:white!important;font-size:clamp(40px,7vw,100px)!important;}
    html.minddesign-preview .statement-title span {opacity:1!important;transform:none!important;color:white!important;}
    html.minddesign-preview .portfolio-section {height:auto!important;padding:30px 0!important;}
    html.minddesign-preview .portfolio-sticky {overflow:visible!important;padding:0!important;}
    html.minddesign-preview .portfolio-window {overflow:hidden!important;}
    html.minddesign-preview .portfolio-track {transform:none!important;}
    html.minddesign-preview .story-scene {opacity:0!important;visibility:hidden!important;}
    html.minddesign-preview #scene-logo {opacity:1!important;visibility:visible!important;}
    html.minddesign-preview .webdesign-section,
    html.minddesign-preview .back-to-top,
    html.minddesign-preview .tool-preview {display:none!important;}
  `;
  document.head.appendChild(style);
  // Die eingebettete Website erhält eine eigene, lückenlose Marquee-Schleife.
  const previewTrack = document.querySelector("#marquee-track");
  if (previewTrack && !reducedMotion) {
    const originals = [...previewTrack.children].map(el => el.cloneNode(true));
    let segmentWidth = 0;
    let offset = 0;
    let last = 0;
    function preparePreviewMarquee() {
      previewTrack.replaceChildren(...originals.map(el => el.cloneNode(true)));
      const gap = parseFloat(getComputedStyle(previewTrack).columnGap) || 0;
      segmentWidth = previewTrack.scrollWidth + gap;
      if (!segmentWidth) return;
      const count = Math.ceil(innerWidth / segmentWidth) + 3;
      for (let i = 0; i < count; i++) {
        originals.forEach(el => {
          const clone = el.cloneNode(true);
          clone.setAttribute("aria-hidden", "true");
          previewTrack.appendChild(clone);
        });
      }
      offset %= segmentWidth;
    }
    function animatePreviewMarquee(time) {
      if (!segmentWidth) preparePreviewMarquee();
      if (last && segmentWidth && !document.hidden) {
        offset = (offset + Math.min((time - last) / 1000, .05) * 44) % segmentWidth;
        previewTrack.style.transform = `translate3d(${-offset}px,0,0)`;
      }
      last = time;
      requestAnimationFrame(animatePreviewMarquee);
    }
    preparePreviewMarquee();
    document.fonts?.ready.then(preparePreviewMarquee);
    window.addEventListener("resize", preparePreviewMarquee);
    requestAnimationFrame(animatePreviewMarquee);
  }
  // Kein startMindDesign(): So laufen darin keine Scroll-/Popup-Animationen.
}

/* ==========================================
   24. WEBDESIGN – GERÄTEWECHSEL + LIVE-SCROLL
   ========================================== */
function setupWebdesign() {
  const section = $("#webdesign-scroll");
  const sticky = $("#webdesign-sticky");
  const device = $("#device");
  const screen = $("#device-screen");
  const oldImage = $("#device-image");
  if (!section || !sticky || !device || !screen) return;

  // Das HTML-Gerätegerüst bleibt erhalten; nur das Bild wird ersetzt.
  oldImage?.remove();
  const frame = document.createElement("iframe");
  frame.className = "minddesign-live-frame";
  frame.title = "Live-Vorschau von MindDesign";
  frame.tabIndex = -1;
  frame.setAttribute("aria-hidden", "true");
  frame.setAttribute("loading", "eager");
  frame.setAttribute("scrolling", "no");
  const url = new URL("index.html", location.href);
  url.searchParams.set("minddesign-preview", "1");
  frame.src = url.href;
  screen.appendChild(frame);

  let current = -1;
  let lastTime = 0;
  let scrollY = 0;
  let direction = 1;
  let loaded = false;

  function fitFrame() {
    const data = DEVICES[Math.max(current, 0)];
    const width = Math.max(1, screen.clientWidth);
    const height = Math.max(1, screen.clientHeight);
    const scale = width / data.viewport;
    frame.style.width = `${data.viewport}px`;
    frame.style.height = `${Math.ceil(height / scale)}px`;
    frame.style.transform = `scale(${scale})`;
  }

  function show(index) {
    if (current === index) return;
    current = index;
    const data = DEVICES[index];
    device.className = "device " + data.className;
    $("#device-category").textContent = data.category;
    $("#device-heading").textContent = data.heading;
    $("#device-description").textContent = data.text;
    scrollY = 0; direction = 1;
    requestAnimationFrame(() => {
      fitFrame();
      try {frame.contentWindow?.scrollTo(0, 0);} catch (_) {}
    });
    animate(device, [{opacity:.4,transform:"scale(.9)"},{opacity:1,transform:"scale(1)"}], {duration:650});
  }

  function measure() {
    section.style.height = `${sticky.offsetHeight + SETTINGS.deviceScrollStep * DEVICES.length}px`;
    fitFrame();
  }

  registerScroll(() => {
    if (!elementVisible(sticky)) return;
    const progress = scrollPosition(section, sticky);
    show(Math.min(DEVICES.length - 1, Math.floor(progress * DEVICES.length)));
  });

  // Scrollt die echte Website im Gerät automatisch, ohne den Hauptscroll zu beeinflussen.
  function tick(time) {
    const dt = lastTime ? Math.min((time-lastTime)/1000, .05) : 0;
    lastTime = time;
    if (loaded && !reducedMotion && elementVisible(screen) && !document.hidden) {
      try {
        const doc = frame.contentDocument;
        const max = Math.max(0, doc.documentElement.scrollHeight - frame.contentWindow.innerHeight);
        if (max > 0) {
          scrollY = Math.max(0, Math.min(max, scrollY + direction * dt * 95));
          if (scrollY >= max) direction = -1;
          if (scrollY <= 0) direction = 1;
          frame.contentWindow.scrollTo(0, scrollY);
        }
      } catch (_) { /* file:// kann iframe-Zugriff lokal einschränken; Netlify nicht */ }
    }
    requestAnimationFrame(tick);
  }
  frame.addEventListener("load", () => {loaded = true;fitFrame();scrollY=0;});
  window.addEventListener("resize", measure);
  window.addEventListener("load", measure);
  document.fonts?.ready.then(measure);
  show(0); measure();
  requestAnimationFrame(tick);
}

/* ==========================================
   25. PORTFOLIO – PROJEKTE VERGRÖSSERN
   ========================================== */
function setupProjects() {
  const dialog = $("#project-dialog");
  const dialogImage = $("#dialog-image");
  $$(".project").forEach(project => {
    project.addEventListener("click", () => {
      const picture = $("img", project);
      $("#dialog-title").textContent =
        project.dataset.title;
      dialogImage.src = picture.src;
      dialogImage.alt = picture.alt;
      dialog.showModal();
      animate(
        dialogImage,
        [
          {
            opacity: 0,
            transform:
              "scale(.82) rotate(-3deg)"
          },
          {
            opacity: 1,
            transform: "none"
          }
        ],
        {
          duration: 650
        }
      );
    });
  });
  $("#dialog-close").addEventListener(
    "click",
    () => dialog.close()
  );
  dialog.addEventListener("click", event => {
    if (event.target === dialog) {
      dialog.close();
    }
  });
}

/* ==========================================
   26. KONTAKT – E-MAIL VORBEREITEN
   ========================================== */
function setupContact() {
  $("#contact-form").addEventListener(
    "submit",
    event => {
      event.preventDefault();
      const form = new FormData(
        event.currentTarget
      );
      const name =
        String(form.get("name") || "");
      const email =
        String(form.get("email") || "");
      const message =
        String(form.get("message") || "");
      const subject = encodeURIComponent(
        "MindDesign Anfrage von " + name
      );
      const body = encodeURIComponent(
        message +
        "\n\n" +
        name +
        "\n" +
        email
      );
      window.location.href =
        "mailto:jennifer.schubert45@gmail.com" +
        "?subject=" + subject +
        "&body=" + body;
    }
  );
}

/* ==========================================
   27. START – ALLE ANIMATIONEN
   ========================================== */

/* ==========================================
   BACK TO TOP – wird automatisch eingefügt.
   Die HTML-Datei muss nicht geändert werden.
   ========================================== */
function setupBackToTop() {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "back-to-top";
  button.id = "back-to-top";
  button.setAttribute("aria-label", "Zurück zum Seitenanfang");
  button.innerHTML = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 19 V5" />
      <path d="M5 12 L12 5 L19 12" />
    </svg>
  `;
  document.body.append(button);
  registerScroll(() => {
    button.classList.toggle("is-visible", window.scrollY > 420);
  });
  button.addEventListener("click", () => {
    window.scrollTo({
      top: 0,
      behavior: reducedMotion ? "auto" : "smooth"
    });
  });
}
function startMindDesign() {
  const modules = [
    setupNavigation,
    setupHero,
    setupMarquee,
    setupPortraitNotes,
    setupFacts,
    setupJourney,
    setupStatement,
    setupStory,
    setupPortfolio,
    setupTools,
    setupWebdesign,
    setupProjects,
    setupContact,
    setupBackToTop
  ];
  modules.forEach(module => {
    try {
      module();
    } catch (error) {
      console.error(
        "MindDesign – Fehler in " +
        module.name,
        error
      );
    }
  });
  $("#year").textContent =
    new Date().getFullYear();
  window.addEventListener(
    "scroll",
    requestScroll,
    { passive: true }
  );
  window.addEventListener(
    "resize",
    requestScroll
  );
  window.addEventListener(
    "load",
    requestScroll
  );
  document.fonts?.ready.then(
    requestScroll
  );
  requestScroll();
}

/* ==========================================
   28. INITIALISIERUNG
   ========================================== */
const isMindDesignPreview = new URLSearchParams(location.search).has("minddesign-preview");
const initializeMindDesign = isMindDesignPreview ? setupEmbeddedPreview : startMindDesign;
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeMindDesign, { once: true });
} else {
  initializeMindDesign();
}
