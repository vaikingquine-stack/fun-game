import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import confetti from 'canvas-confetti';

type WorldId = 'pasta' | 'pizza' | 'icecream';

interface Customization {
  shirtColor: string;
  hatType: 'none' | 'blue' | 'leopard';
}

export default function App() {
  // --- מצבי המשחק ---
  const [currentScreen, setCurrentScreen] = useState<'start' | 'game'>('start');
  const [selectedWorld, setSelectedWorld] = useState<WorldId>('pasta');
  const [unlockedWorlds, setUnlockedWorlds] = useState<WorldId[]>(['pasta']);
  
  // משאבים
  const [wheatCount, setWheatCount] = useState<number>(3); // מגיעים עם מעט משאבים להתחלה
  const [tomatoCount, setTomatoCount] = useState<number>(3);
  const [sauceCount, setSauceCount] = useState<number>(0);

  // התאמת דמות
  const [customizerOpen, setCustomizerOpen] = useState<boolean>(false);
  const [customization, setCustomization] = useState<Customization>({
    shirtColor: '#ef4444',
    hatType: 'none',
  });

  // מצב מטבח
  const [kitchenOpen, setKitchenOpen] = useState<boolean>(false);
  const [cuttingBoardState, setCuttingBoardState] = useState<'empty' | 'whole' | 'sliced'>('empty');

  // הודעת פופ-אפ
  const [popupMessage, setPopupMessage] = useState<string | null>(null);

  // רפרנסים ל-Three.js ואנימציה
  const mountRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<THREE.Group | null>(null);
  const shirtMaterialRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const hatMeshRef = useRef<THREE.Mesh | null>(null);
  
  // איברים לאנימציית הליכה
  const leftArmRef = useRef<THREE.Group | null>(null);
  const rightArmRef = useRef<THREE.Group | null>(null);
  const leftLegRef = useRef<THREE.Group | null>(null);
  const rightLegRef = useRef<THREE.Group | null>(null);
  
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const walkTimeRef = useRef<number>(0);

  // בדיקת פתיחת עולם 2 (פיצה)
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

  // --- אתחול סצנת Three.js ---
  useEffect(() => {
    if (currentScreen !== 'game' || !mountRef.current) return;

    const container = mountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#87ceeb');

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(0, 18, 22);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    // תאורה
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(20, 40, 20);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // מים
    const waterGeo = new THREE.PlaneGeometry(120, 120);
    const waterMat = new THREE.MeshStandardMaterial({ color: 0x2980b9, roughness: 0.1 });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.y = -0.5;
    scene.add(water);

    // 🟦 אי מרובע (Square World)
    const islandGeo = new THREE.BoxGeometry(32, 1, 32);
    const islandMat = new THREE.MeshStandardMaterial({ color: 0x7ec850 });
    const island = new THREE.Mesh(islandGeo, islandMat);
    island.position.y = -0.5;
    island.receiveShadow = true;
    scene.add(island);

    // 🌾 רביע 1: שדה ריבועי חיטה מלאים
    const wheatGroup = new THREE.Group();
    wheatGroup.position.set(7, 0.5, -7);
    for (let x = 0; x < 3; x++) {
      for (let z = 0; z < 3; z++) {
        const wheatBlock = new THREE.Mesh(
          new THREE.BoxGeometry(1.4, 1.2, 1.4),
          new THREE.MeshStandardMaterial({ color: 0xf1c40f, roughness: 0.6 })
        );
        wheatBlock.position.set(x * 1.8 - 1.8, 0.6, z * 1.8 - 1.8);
        wheatGroup.add(wheatBlock);
      }
    }
    scene.add(wheatGroup);

    // 🍅 רביע 2: שדה קופסאות עגבניות
    const tomatoGroup = new THREE.Group();
    tomatoGroup.position.set(-7, 0.5, -7);
    for (let i = 0; i < 4; i++) {
      const boxGroup = new THREE.Group();
      boxGroup.position.set((i % 2) * 2.2 - 1.1, 0, Math.floor(i / 2) * 2.2 - 1.1);

      // קופסת עץ מרובעת
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 0.8, 1.5),
        new THREE.MeshStandardMaterial({ color: 0x8b4513 })
      );
      box.position.y = 0.4;
      boxGroup.add(box);

      // עגבניות בתוך הקופסה
      for (let t = 0; t < 4; t++) {
        const tomato = new THREE.Mesh(
          new THREE.SphereGeometry(0.3, 8, 8),
          new THREE.MeshStandardMaterial({ color: 0xe74c3c })
        );
        tomato.position.set((t % 2) * 0.5 - 0.25, 0.9, Math.floor(t / 2) * 0.5 - 0.25);
        boxGroup.add(tomato);
      }
      tomatoGroup.add(boxGroup);
    }
    scene.add(tomatoGroup);

    // 🍝 רביע 3: חנות פסטה
    const pastaShop = new THREE.Group();
    pastaShop.position.set(7, 0.5, 7);
    const shopBase = new THREE.Mesh(
      new THREE.BoxGeometry(3.5, 2.5, 3.5),
      new THREE.MeshStandardMaterial({ color: 0xf39c12 })
    );
    shopBase.position.y = 1.25;
    pastaShop.add(shopBase);
    scene.add(pastaShop);

    // 🏠 רביע 4: בית השחקן הכחול
    const playerHome = new THREE.Group();
    playerHome.position.set(-7, 0.5, 7);
    const houseBase = new THREE.Mesh(
      new THREE.BoxGeometry(4, 3, 4),
      new THREE.MeshStandardMaterial({ color: 0x2980b9 })
    );
    houseBase.position.y = 1.5;
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(3.5, 1.8, 4),
      new THREE.MeshStandardMaterial({ color: 0xc0392b })
    );
    roof.position.y = 3.9;
    roof.rotation.y = Math.PI / 4;
    playerHome.add(houseBase, roof);
    scene.add(playerHome);

    // 🚶 יצירת דמות גדולה עם 2 ידיים ו-2 רגליים
    const player = new THREE.Group();
    player.position.set(0, 0, 0);

    // גוף (חולצה)
    const shirtMat = new THREE.MeshStandardMaterial({ color: customization.shirtColor });
    shirtMaterialRef.current = shirtMat;
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.4, 0.6), shirtMat);
    body.position.y = 1.3;
    player.add(body);

    // ראש
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.45, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0xffdbac })
    );
    head.position.y = 2.3;
    player.add(head);

    // כובע
    const hatMesh = new THREE.Mesh(
      new THREE.ConeGeometry(0.55, 0.5, 16),
      new THREE.MeshStandardMaterial({ color: 0x2980b9 })
    );
    hatMesh.position.y = 2.8;
    hatMesh.visible = customization.hatType !== 'none';
    hatMeshRef.current = hatMesh;
    player.add(hatMesh);

    // זרוע שמאל
    const lArmGroup = new THREE.Group();
    lArmGroup.position.set(-0.7, 1.8, 0);
    const armGeo = new THREE.BoxGeometry(0.3, 1.0, 0.3);
    const lArm = new THREE.Mesh(armGeo, shirtMat);
    lArm.position.y = -0.5;
    lArmGroup.add(lArm);
    player.add(lArmGroup);
    leftArmRef.current = lArmGroup;

    // זרוע ימין
    const rArmGroup = new THREE.Group();
    rArmGroup.position.set(0.7, 1.8, 0);
    const rArm = new THREE.Mesh(armGeo, shirtMat);
    rArm.position.y = -0.5;
    rArmGroup.add(rArm);
    player.add(rArmGroup);
    rightArmRef.current = rArmGroup;

    // רגל שמאל
    const lLegGroup = new THREE.Group();
    lLegGroup.position.set(-0.3, 0.6, 0);
    const legGeo = new THREE.BoxGeometry(0.35, 0.9, 0.35);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a });
    const lLeg = new THREE.Mesh(legGeo, legMat);
    lLeg.position.y = -0.45;
    lLegGroup.add(lLeg);
    player.add(lLegGroup);
    leftLegRef.current = lLegGroup;

    // רגל ימין
    const rLegGroup = new THREE.Group();
    rLegGroup.position.set(0.3, 0.6, 0);
    const rLeg = new THREE.Mesh(legGeo, legMat);
    rLeg.position.y = -0.45;
    rLegGroup.add(rLeg);
    player.add(rLegGroup);
    rightLegRef.current = rLegGroup;

    scene.add(player);
    playerRef.current = player;

    // ניהול מקשים
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = true;

      if (e.code === 'Space') {
        if (!playerRef.current) return;
        const px = playerRef.current.position.x;
        const pz = playerRef.current.position.z;

        // בדיקה אם הדמות צמודה לבית הכחול
        if (Math.hypot(px - (-7), pz - 7) < 4.0) {
          setKitchenOpen(true);
          showPopup('🍳 נכנסת למטבח!');
          return;
        }

        // קציר בשדות
        if (Math.hypot(px - 7, pz - (-7)) < 3.5) {
          setWheatCount((prev) => prev + 1);
          showPopup('🌾 קצרת ריבוע חיטה!');
        } else if (Math.hypot(px - (-7), pz - (-7)) < 3.5) {
          setTomatoCount((prev) => prev + 1);
          showPopup('🍅 אספת קופסת עגבניות!');
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // 🔄 לולאת האנימציה (Game Loop)
    let animationFrameId: number;
    const speed = 0.16;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (playerRef.current && !kitchenOpen) {
        const keys = keysPressed.current;
        let isMoving = false;

        if (keys['w'] || keys['arrowup']) { playerRef.current.position.z -= speed; isMoving = true; }
        if (keys['s'] || keys['arrowdown']) { playerRef.current.position.z += speed; isMoving = true; }
        if (keys['a'] || keys['arrowleft']) { playerRef.current.position.x -= speed; isMoving = true; }
        if (keys['d'] || keys['arrowright']) { playerRef.current.position.x += speed; isMoving = true; }

        // גבולות המפה המרובעת
        playerRef.current.position.x = Math.max(-14.5, Math.min(14.5, playerRef.current.position.x));
        playerRef.current.position.z = Math.max(-14.5, Math.min(14.5, playerRef.current.position.z));

        // 🏃 אנימציית הזזת ידיים ורגליים בזמן הליכה
        if (isMoving) {
          walkTimeRef.current += 0.2;
          const swing = Math.sin(walkTimeRef.current) * 0.7;
          if (leftArmRef.current) leftArmRef.current.rotation.x = -swing;
          if (rightArmRef.current) rightArmRef.current.rotation.x = swing;
          if (leftLegRef.current) leftLegRef.current.rotation.x = swing;
          if (rightLegRef.current) rightLegRef.current.rotation.x = -swing;
        } else {
          if (leftArmRef.current) leftArmRef.current.rotation.x = 0;
          if (rightArmRef.current) rightArmRef.current.rotation.x = 0;
          if (leftLegRef.current) leftLegRef.current.rotation.x = 0;
          if (rightLegRef.current) rightLegRef.current.rotation.x = 0;
        }

        // המצלמה עוקבת
        camera.position.x = playerRef.current.position.x;
        camera.position.z = playerRef.current.position.z + 16;
        camera.lookAt(playerRef.current.position.x, 1, playerRef.current.position.z);
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [currentScreen, kitchenOpen]);

  // עדכון התאמת דמות
  useEffect(() => {
    if (shirtMaterialRef.current) shirtMaterialRef.current.color.set(customization.shirtColor);
    if (hatMeshRef.current) hatMeshRef.current.visible = customization.hatType !== 'none';
  }, [customization]);

  // --- מסך פתיחה ---
  if (currentScreen === 'start') {
    return (
      <div className="start-screen w-full h-full flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-5xl font-black text-rose-800 mb-2">🌍 העולם שלי</h1>
        <p className="text-xl text-rose-700 mb-8 font-semibold">בחר עולם והתחל לשחק!</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full">
          <div
            onClick={() => { setSelectedWorld('pasta'); setCurrentScreen('game'); }}
            className="cursor-pointer bg-white p-6 rounded-2xl shadow-lg border-4 border-yellow-400 hover:scale-105 transition"
          >
            <div className="text-6xl mb-3">🍝</div>
            <h2 className="text-2xl font-bold mb-1">עולם הפסטה</h2>
            <span className="inline-block bg-green-100 text-green-800 text-sm px-3 py-1 rounded-full font-bold">
              פתוח למשחק
            </span>
          </div>

          <div
            onClick={() => {
              if (unlockedWorlds.includes('pizza')) {
                setSelectedWorld('pizza');
                setCurrentScreen('game');
              }
            }}
            className={`p-6 rounded-2xl shadow-lg border-4 transition ${
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

          <div className="bg-gray-200 opacity-75 p-6 rounded-2xl shadow-lg border-4 border-gray-300 cursor-not-allowed">
            <div className="text-6xl mb-3">🍨</div>
            <h2 className="text-2xl font-bold mb-1">עולם הגלידה</h2>
            <span className="inline-block bg-gray-300 text-gray-700 text-xs px-3 py-1 rounded-full font-bold">🔒 נעול</span>
          </div>
        </div>
      </div>
    );
  }

  // --- מסך המשחק ה-3D ---
  return (
    <div className="relative w-full h-full">
      <div ref={mountRef} className="w-full h-full" />

      {/* מלאי עליון */}
      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur p-4 rounded-xl shadow-lg flex gap-6 items-center">
        <div className="text-lg font-bold">🌾 חיטה: <span className="text-yellow-600">{wheatCount}</span></div>
        <div className="text-lg font-bold">🍅 עגבניות: <span className="text-red-600">{tomatoCount}</span></div>
        <div className="text-lg font-bold">🥣 רוטב: <span className="text-rose-600">{sauceCount}</span></div>
        <button onClick={() => setCurrentScreen('start')} className="bg-gray-200 hover:bg-gray-300 font-bold px-3 py-1.5 rounded-lg text-sm">
          🏠 תפריט
        </button>
      </div>

      {/* התאמת דמות */}
      <button onClick={() => setCustomizerOpen(!customizerOpen)} className="absolute top-4 left-4 bg-white/90 p-3 rounded-full shadow-lg text-2xl hover:scale-110">
        🧒
      </button>

      {customizerOpen && (
        <div className="absolute top-16 left-4 bg-white p-4 rounded-xl shadow-2xl border w-64 z-10">
          <h3 className="font-bold text-lg mb-3">התאמת דמות</h3>
          <div className="mb-4">
            <label className="block text-sm font-semibold mb-2">צבע חולצה:</label>
            <div className="flex gap-2">
              {['#ef4444', '#3b82f6', '#ec4899'].map((color) => (
                <button
                  key={color}
                  onClick={() => setCustomization((prev) => ({ ...prev, shirtColor: color }))}
                  className="w-8 h-8 rounded-full border-2 border-white shadow-md"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 🍳 מודאל תצוגת מטבח מלמעלה (Top-Down Kitchen View) */}
      {kitchenOpen && (
        <div className="absolute inset-0 bg-black/75 flex items-center justify-center p-4 z-50">
          <div className="bg-[#d7ccc8] border-8 border-[#8d6e63] rounded-3xl p-6 w-full max-w-3xl shadow-2xl relative flex flex-col items-center">
            <button
              onClick={() => setKitchenOpen(false)}
              className="absolute top-4 left-4 bg-red-500 text-white font-black px-4 py-2 rounded-xl hover:bg-red-600"
            >
              ✖ סגור מטבח
            </button>

            <h2 className="text-3xl font-black text-[#4e342e] mb-4">🍽️ שולחן המטבח שלי</h2>

            {/* שולחן העבודה (מבט על) */}
            <div className="bg-[#bcaaa4] w-full h-80 rounded-2xl border-4 border-[#6d4c41] p-4 relative flex flex-col justify-between items-center shadow-inner">
              
              {/* קערות עליונות: בצק ורוטב */}
              <div className="w-full flex justify-between px-8">
                {/* קערה 1: בצק */}
                <div className="flex flex-col items-center">
                  <div className="w-24 h-24 rounded-full bg-amber-100 border-4 border-amber-300 flex items-center justify-center shadow-md">
                    <span className="text-amber-700 font-extrabold text-sm">בצק</span>
                  </div>
                </div>

                {/* קערה 2: רוטב */}
                <div className="flex flex-col items-center">
                  <div className={`w-24 h-24 rounded-full border-4 border-red-300 flex flex-col items-center justify-center shadow-md ${
                    sauceCount > 0 ? 'bg-red-500 text-white' : 'bg-red-100 text-red-800'
                  }`}>
                    <span className="font-extrabold text-sm">רוטב</span>
                    <span className="text-xs font-bold">({sauceCount})</span>
                  </div>
                </div>
              </div>

              {/* מרכז השולחן: קרש חיתוך + סכין + כפות */}
              <div className="flex items-center gap-6 my-auto">
                <span className="text-3xl">🥄🥄</span> {/* 2 כפות */}

                {/* קרש חיתוך */}
                <div className="w-48 h-28 bg-[#a1887f] border-4 border-[#5d4037] rounded-lg shadow-lg flex flex-col items-center justify-center relative">
                  <span className="text-xs text-amber-100 absolute top-1 font-bold">קרש חיתוך</span>
                  
                  {cuttingBoardState === 'empty' && <span className="text-gray-300 text-xs">(ריק)</span>}
                  {cuttingBoardState === 'whole' && <span className="text-5xl">🍅</span>}
                  {cuttingBoardState === 'sliced' && (
                    <div className="flex gap-1 text-2xl animate-pulse">
                      <span>🔴</span><span>🔴</span><span>🔴</span>
                    </div>
                  )}
                </div>

                <span className="text-4xl cursor-pointer" title="סכין">🔪</span> {/* סכין */}
              </div>

              {/* חלק תחתון של השולחן: חומרי גלם (חיטה ועגבניות) */}
              <div className="w-full flex justify-between px-8">
                {/* קערת ריבועי חיטה */}
                <div className="flex flex-col items-center">
                  <div className="w-20 h-16 bg-yellow-200 border-2 border-yellow-500 rounded-b-full flex items-center justify-center">
                    <span className="text-xs font-bold">🌾 {wheatCount} ריבועים</span>
                  </div>
                </div>

                {/* ערמת קופסאות עגבניות */}
                <div className="flex flex-col items-center">
                  <div className="w-20 h-16 bg-amber-800 border-2 border-amber-900 rounded-md flex flex-col items-center justify-center text-white">
                    <span className="text-xs font-bold">🍅 {tomatoCount} קופסאות</span>
                  </div>
                </div>
              </div>

            </div>

            {/* כפתורי פעולה לאינטראקציה במטבח */}
            <div className="flex gap-4 mt-6">
              {/* שלב 1: הנחת עגבנייה */}
              <button
                disabled={tomatoCount === 0 || cuttingBoardState !== 'empty'}
                onClick={() => {
                  setTomatoCount((prev) => prev - 1);
                  setCuttingBoardState('whole');
                }}
                className="bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-xl shadow"
              >
                1. הנח עגבנייה על הקרש 🍅
              </button>

              {/* שלב 2: חיתוך בסכין */}
              <button
                disabled={cuttingBoardState !== 'whole'}
                onClick={() => setCuttingBoardState('sliced')}
                className="bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-black font-bold px-4 py-2 rounded-xl shadow"
              >
                2. חתוך בסכין לפרוסות 🔪
              </button>

              {/* שלב 3: העברה לקערת הרוטב */}
              <button
                disabled={cuttingBoardState !== 'sliced'}
                onClick={() => {
                  setSauceCount((prev) => prev + 1);
                  setCuttingBoardState('empty');
                  showPopup('🥫 הוספת עגבניות חתוכות לקערת הרוטב!');
                }}
                className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-xl shadow"
              >
                3. הכנס לקערת רוטב 🥣
              </button>
            </div>

          </div>
        </div>
      )}

      {/* פופ-אפ הודעות */}
      {popupMessage && (
        <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-yellow-400 text-black text-xl font-black px-6 py-3 rounded-2xl shadow-2xl animate-bounce">
          {popupMessage}
        </div>
      )}

      <div className="absolute bottom-4 right-4 bg-black/60 text-white p-3 rounded-lg text-sm">
        <p>🎮 **תנועה:** WASD / מקשי חצים</p>
        <p>🌾 **קציר / 🏠 כניסה למטבח:** מקש רווח (Space) צמוד לבית או לשדות</p>
      </div>
    </div>
  );
}