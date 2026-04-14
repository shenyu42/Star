import {
  db,
  doc,
  runTransaction,
  getDoc
} from './firebase.js';

export async function addScore(coupleId, amount) {
  const coupleRef = doc(db, 'couples', coupleId);

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(coupleRef);

    if (!snap.exists()) {
      throw new Error('找不到配對資料。');
    }

    const current = snap.data().score || 0;
    transaction.update(coupleRef, { score: current + amount });
  });
}

export async function updatePetExp(coupleId, amount) {
  const coupleRef = doc(db, 'couples', coupleId);

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(coupleRef);

    if (!snap.exists()) {
      throw new Error('找不到配對資料。');
    }

    const pet = snap.data().pet || {
      name: 'Star',
      level: 1,
      exp: 0,
      skin: 'default'
    };

    let { name, level, exp, skin } = pet;
    exp += amount;

    const EXP_PER_LEVEL = 20;

    while (exp >= EXP_PER_LEVEL) {
      exp -= EXP_PER_LEVEL;
      level += 1;
    }

    transaction.update(coupleRef, {
      pet: { name, level, exp, skin }
    });
  });
}

export async function updatePetField(coupleId, fields) {
  const coupleRef = doc(db, 'couples', coupleId);

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(coupleRef);

    if (!snap.exists()) {
      throw new Error('找不到配對資料。');
    }

    const pet = snap.data().pet || {
      name: 'Star',
      level: 1,
      exp: 0,
      skin: 'default'
    };

    transaction.update(coupleRef, {
      pet: { ...pet, ...fields }
    });
  });
}
