import { addDoc, deleteDoc, collection, doc } from "firebase/firestore";
import { db } from "./firebaseConfig";

export async function adicionarFavorito(userId, noticia) {
  return addDoc(collection(db, "favoritos"), {
    userId,
    ...noticia,
    criadoEm: new Date(),
  });
}

export async function removerFavorito(id) {
  return deleteDoc(doc(db, "favoritos", id));
}
