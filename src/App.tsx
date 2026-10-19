import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import confetti from 'canvas-confetti';

// --- טיפוסים ---
type WorldId = 'pasta' | 'pizza' | 'icecream';

interface Customization {
  shirtColor: string;
  hatType: 'none' | 'blue' | 'leopard';
}

export default function App() {
  // --- מצבי המשחק (Game States) ---
  const [currentScreen, setCurrentScreen] = useState<'start' | 'game'>('start');
  const [selectedWorld, setSelectedWorld] = useState<WorldId>('pasta');
  const [unlockedWorlds, setUnlockedWorlds] = useState<WorldId[]>(['pasta']);
  
  // משאבים (Inventory)
  const [wheatCount, setWheatCount] = useState<number>(0);
  const [tomatoCount, setTomatoCount] = useState<number>(0);

  // התאמת דמות[cite: 1]
  const [customizerOpen, setCustomizerOpen] = useState<boolean>(false);
  const [customization, setCustomization] = useState<Customization>({
    shirtColor: '#ef4444', // אדום ברירת מחדל[cite: 1]
    hatType: 'none',
  });

  // הודעת פופ-אפ צפה
  const [popupMessage, setPopupMessage] = useState<string | null>(null);

  // רפרנסים ל-Three.js
  const mountRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<THREE.Group | null>(null);
  const shirtMaterialRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const hatMeshRef = useRef<THREE.Mesh | null>(null);
  const keysPressed = useRef<{ [key: string]: boolean }>({});

  // בדיקת פתיחת עולם 2 (פיצה)[cite: 1]
  useEffect(() => {
    if (wheatCount >= 10 && tomatoCount >= 10 && !unlockedWorlds.includes('pizza')) {
      setUnlockedWorlds((prev) => [...prev, 'pizza']);
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      showPopup('🎉 מזל טוב! פתחת את עולם הפיצה!');
    }
  }, [wheatCount, tomatoCount, unlockedWorlds]);

  const showPopup = (msg: string) => {
    setPopupMessage(msg);
    setTimeout(() => setPopupMessage(null), 2500);
  };

  // --- אתחול סצנת Three.js[cite: 1] ---
  useEffect(() => {
    if (currentScreen !== 'game' || !mountRef.current) return;

    const container = mountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#87ceeb'); // שמיים כחולים

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(0, 15, 20);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    // 2. תאורה
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(20, 40, 20);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // 3. מים מסביב לאי[cite: 1]
    const waterGeo = new THREE.PlaneGeometry(100, 100);
    const waterMat = new THREE.MeshStandardMaterial({ color: 0x2980b9, roughness: 0.1 });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.y = -0.5;
    scene.add(water);

    // 4. האי התלת-ממדי (אדמה)[cite: 1]
    const islandGeo = new THREE.CylinderGeometry(18, 20, 1, 32);
    const islandMat = new THREE.MeshStandardMaterial({ color: 0x7ec850 });
    const island = new THREE.Mesh(islandGeo, islandMat);
    island.receiveShadow = true;
    scene.add(island);

    // 5. בניית 4 הרביעים במפה[cite: 1]
    // רביע 1: שדה חיטה (צפון-מזרח)[cite: 1]
    const wheatGroup = new THREE.Group();
    wheatGroup.position.set(6, 0.5, -6);
    for (let i = 0; i < 5; i++) {
      const wheatStem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.1, 1.5),
        new THREE.MeshStandardMaterial({ color: 0xf1c40f })
      );
      wheatStem.position.set((i % 3) * 1.2 - 1, 0.75, Math.floor(i / 3) * 1.2 - 1);
      wheatGroup.add(wheatStem);
    }
    scene.add(wheatGroup);

    // רביע 2: שדה עגבניות (צפון-מערב)[cite: 1]
    const tomatoGroup = new THREE.Group();
    tomatoGroup.position.set(-6, 0.5, -6);
    for (let i = 0; i < 4; i++) {
      const bush = new THREE.Mesh(
        new THREE.SphereGeometry(0.8, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0x27ae60 })
      );
      bush.position.set((i % 2) * 2 - 1, 0.8, Math.floor(i / 2) * 2 - 1);
      
      const tomato = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0xe74c3c })
      );
      tomato.position.set(0.3, 0.4, 0.5);
      bush.add(tomato);
      tomatoGroup.add(bush);
    }
    scene.add(tomatoGroup);

    // רביע 3: חנות פסטה (דרום-מזרח)[cite: 1]
    const pastaShop = new THREE.Group();
    pastaShop.position.set(6, 0.5, 6);
    const shopBase = new THREE.Mesh(
      new THREE.BoxGeometry(3, 2.5, 3),
      new THREE.MeshStandardMaterial({ color: 0xf39c12 })
    );
    shopBase.position.y = 1.25;
    pastaShop.add(shopBase);
    scene.add(pastaShop);

    // רביע 4: בית השחקן - בית כחול עם חצר[cite: 1]
    const playerHome = new THREE.Group();
    playerHome.position.set(-6, 0.5, 6);
    const houseBase = new THREE.Mesh(
      new THREE.BoxGeometry(3.5, 3, 3.5),
      new THREE.MeshStandardMaterial({ color: 0x2980b9 }) // בית כחול[cite: 1]
    );
    houseBase.position.y = 1.5;
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(3, 1.5, 4),
      new THREE.MeshStandardMaterial({ color: 0xc0392b })
    );
    roof.position.y = 3.75;
    roof.rotation.y = Math.PI / 4;
    playerHome.add(houseBase, roof);
    scene.add(playerHome);

    // 6. יצירת השחקן (Player)[cite: 1]
    const player = new THREE.Group();
    player.position.set(0, 0.5, 0);

    // גוף / חולצה
    const shirtMat = new THREE.MeshStandardMaterial({ color: customization.shirtColor });
    shirtMaterialRef.current = shirtMat;
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.2), shirtMat);
    body.position.y = 0.6;
    player.add(body);

    // ראש
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.4, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0xffdbac })
    );
    head.position.y = 1.5;
    player.add(head);

    // כובע
    const hatMesh = new THREE.Mesh(
      new THREE.ConeGeometry(0.5, 0.4, 16),
      new THREE.MeshStandardMaterial({ color: 0x2980b9 })
    );
    hatMesh.position.y = 1.9;
    hatMesh.visible = customization.hatType !== 'none';
    hatMeshRef.current = hatMesh;
    player.add(hatMesh);

    scene.add(player);
    playerRef.current = player;

    // 7. ניהול מקשים ותנועה[cite: 1]
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = true;

      // קציר בלחיצה על Space[cite: 1]
      if (e.code === 'Space') {
        checkHarvest();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // בדיקת אקשן קציר
    const checkHarvest = () => {
      if (!playerRef.current) return;
      const px = playerRef.current.position.x;
      const pz = playerRef.current.position.z;

      // קירבה לשדה חיטה[cite: 1]
      if (Math.hypot(px - 6, pz - (-6)) < 3) {
        setWheatCount((prev) => prev + 1);
        showPopup('🌾 קצרת חיטה!');
      }
      // קירבה לשדה עגבניות[cite: 1]
      else if (Math.hypot(px - (-6), pz - (-6)) < 3) {
        setTomatoCount((prev) => prev + 1);
        showPopup('🍅 אספת עגבנייה!');
      }
    };

    // 8. לולאת הרינדור (Game Loop)
    let animationFrameId: number;
    const speed = 0.15;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (playerRef.current) {
        const keys = keysPressed.current;
        if (keys['w'] || keys['arrowup']) playerRef.current.position.z -= speed;
        if (keys['s'] || keys['arrowdown']) playerRef.current.position.z += speed;
        if (keys['a'] || keys['arrowleft']) playerRef.current.position.x -= speed;
        if (keys['d'] || keys['arrowright']) playerRef.current.position.x += speed;

        // שמירה על תחום האי
        const dist = Math.hypot(playerRef.current.position.x, playerRef.current.position.z);
        if (dist > 14) {
          playerRef.current.position.setLength(14);
        }

        // המצלמה עוקבת אחר השחקן
        camera.position.x = playerRef.current.position.x;
        camera.position.z = playerRef.current.position.z + 15;
        camera.lookAt(playerRef.current.position);
      }

      renderer.render(scene, camera);
    };

    animate();

    // ניקוי ביציאה
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [currentScreen]);

  // עדכון עיצוב השחקן בזמן אמת
  useEffect(() => {
    if (shirtMaterialRef.current) {
      shirtMaterialRef.current.color.set(customization.shirtColor);
    }
    if (hatMeshRef.current) {
      hatMeshRef.current.visible = customization.hatType !== 'none';
    }
  }, [customization]);

  // --- מסך פתיחה[cite: 1] ---
  if (currentScreen === 'start') {
    return (
      <div className="start-screen w-full h-full flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-5xl font-black text-rose-800 mb-2">🍽️ עולם המזון 3D</h1>
        <p className="text-xl text-rose-700 mb-8 font-semibold">בחר עולם והתחל לשחק!</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full">
          {/* עולם 1: פסטה[cite: 1] */}
          <div
            onClick={() => { setSelectedWorld('pasta'); setCurrentScreen('game'); }}
            className={`cursor-pointer bg-white p-6 rounded-2xl shadow-lg border-4 transition transform hover:scale-105 ${
              selectedWorld === 'pasta' ? 'border-yellow-400' : 'border-transparent'
            }`}
          >
            <div className="text-6xl mb-3">🍝</div>
            <h2 className="text-2xl font-bold mb-1">עולם הפסטה</h2>
            <span className="inline-block bg-green-100 text-green-800 text-sm px-3 py-1 rounded-full font-bold">
              פתוח למשחק
            </span>
          </div>

          {/* עולם 2: פיצה[cite: 1] */}
          <div
            onClick={() => {
              if (unlockedWorlds.includes('pizza')) {
                setSelectedWorld('pizza');
                setCurrentScreen('game');
              }
            }}
            className={`p-6 rounded-2xl shadow-lg border-4 transition relative ${
              unlockedWorlds.includes('pizza')
                ? 'bg-white cursor-pointer hover:scale-105 border-red-400'
                : 'bg-gray-200 opacity-75 cursor-not-allowed border-gray-300'
            }`}
          >
            <div className="text-6xl mb-3">🍕</div>
            <h2 className="text-2xl font-bold mb-1">עולם הפיצה</h2>
            {unlockedWorlds.includes('pizza') ? (
              <span className="inline-block bg-green-100 text-green-800 text-sm px-3 py-1 rounded-full font-bold">
                פתוח למשחק
              </span>
            ) : (
              <span className="inline-block bg-red-100 text-red-800 text-xs px-3 py-1 rounded-full font-bold">
                🔒 נפתח לאחר 10 חיטה ו-10 עגבניות
              </span>
            )}
          </div>

          {/* עולם 3: גלידה[cite: 1] */}
          <div className="bg-gray-200 opacity-75 p-6 rounded-2xl shadow-lg border-4 border-gray-300 cursor-not-allowed">
            <div className="text-6xl mb-3">🍨</div>
            <h2 className="text-2xl font-bold mb-1">עולם הגלידה</h2>
            <span className="inline-block bg-gray-300 text-gray-700 text-xs px-3 py-1 rounded-full font-bold">
              🔒 נעול
            </span>
          </div>
        </div>
      </div>
    );
  }

  // --- מסך המשחק התלת-ממדי[cite: 1] ---
  return (
    <div className="relative w-full h-full">
      {/* Three.js Canvas Container */}
      <div ref={mountRef} className="w-full h-full" />

      {/* ממשק עליון - מלאי (Inventory) & כפתור בית */}
      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur p-4 rounded-xl shadow-lg flex gap-6 items-center">
        <div className="text-lg font-bold flex items-center gap-2">
          <span>🌾 חיטה:</span>
          <span className="text-yellow-600">{wheatCount} / 10</span>
        </div>
        <div className="text-lg font-bold flex items-center gap-2">
          <span>🍅 עגבניות:</span>
          <span className="text-red-600">{tomatoCount} / 10</span>
        </div>
        <button
          onClick={() => setCurrentScreen('start')}
          className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold px-3 py-1.5 rounded-lg text-sm transition"
        >
          🏠 תפריט
        </button>
      </div>

      {/* תפריט התאמת דמות (Customizer Button)[cite: 1] */}
      <button
        onClick={() => setCustomizerOpen(!customizerOpen)}
        className="absolute top-4 left-4 bg-white/90 p-3 rounded-full shadow-lg text-2xl hover:scale-110 transition"
        title="התאמת דמות"
      >
        🧒
      </button>

      {/* חלונית התאמת דמות[cite: 1] */}
      {customizerOpen && (
        <div className="absolute top-16 left-4 bg-white p-4 rounded-xl shadow-2xl border w-64 z-10">
          <h3 className="font-bold text-lg mb-3">התאמת דמות</h3>

          {/* חולצה[cite: 1] */}
          <div className="mb-4">
            <label className="block text-sm font-semibold mb-2">צבע חולצה:</label>
            <div className="flex gap-2">
              {[
                { name: 'אדום', color: '#ef4444' },
                { name: 'כחול', color: '#3b82f6' },
                { name: 'ורוד', color: '#ec4899' },
              ].map((item) => (
                <button
                  key={item.color}
                  onClick={() => setCustomization((prev) => ({ ...prev, shirtColor: item.color }))}
                  className="w-8 h-8 rounded-full border-2 border-white shadow-md"
                  style={{ backgroundColor: item.color }}
                />
              ))}
            </div>
          </div>

          {/* כובע[cite: 1] */}
          <div>
            <label className="block text-sm font-semibold mb-2">כובע:</label>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setCustomization((prev) => ({ ...prev, hatType: 'none' }))}
                className={`py-1 px-3 rounded text-sm text-right ${
                  customization.hatType === 'none' ? 'bg-blue-500 text-white' : 'bg-gray-100'
                }`}
              >
                ללא כובע
              </button>
              <button
                onClick={() => setCustomization((prev) => ({ ...prev, hatType: 'blue' }))}
                className={`py-1 px-3 rounded text-sm text-right ${
                  customization.hatType === 'blue' ? 'bg-blue-500 text-white' : 'bg-gray-100'
                }`}
              >
                כובע כחול
              </button>
            </div>
          </div>
        </div>
      )}

      {/* פופ-אפ הודעות מנגנון חוויה[cite: 1] */}
      {popupMessage && (
        <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-yellow-400 text-black text-xl font-black px-6 py-3 rounded-2xl shadow-2xl animate-bounce">
          {popupMessage}
        </div>
      )}

      {/* הוראות מקשים במסך */}
      <div className="absolute bottom-4 right-4 bg-black/60 text-white p-3 rounded-lg text-sm">
        <p>🎮 **מקשים:** תנועה עם WASD / חצים</p>
        <p>🌾 **קציר:** מקש רווח (Space) ליד השדות</p>
      </div>
    </div>
  );
}