import { db } from "./firebaseConfig";
import { doc, setDoc, deleteDoc, collection, getDocs, query, where } from "firebase/firestore";

export async function guardarFavorito(userId, noticia) {
  const ref = doc(db, "favoritos", `${userId}_${noticia.id}`);
  await setDoc(ref, {
    ...noticia,
    userId,
  });
}

export async function removerFavorito(userId, noticiaId) {
  const ref = doc(db, "favoritos", `${userId}_${noticiaId}`);
  await deleteDoc(ref);
}

export async function buscarFavoritos(userId) {
  const ref = collection(db, "favoritos");
  const q = query(ref, where("userId", "==", userId));
  const snap = await getDocs(q);

  return snap.docs.map((d) => d.data());
}
