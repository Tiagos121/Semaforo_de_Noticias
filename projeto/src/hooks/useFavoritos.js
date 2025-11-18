import { useEffect, useState } from "react";
import { db } from "../firebase/firebaseConfig";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { useAuth } from "../context/useAuth";

export function useFavoritos() {
  const { user } = useAuth();
  const [favoritos, setFavoritos] = useState([]);

  useEffect(() => {
    if (!user) {
      setFavoritos([]);
      return;
    }

    const q = query(
      collection(db, "favoritos"),
      where("userId", "==", user.uid)
    );

    const unsub = onSnapshot(q, (snap) => {
      const arr = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setFavoritos(arr);
    });

    return () => unsub();
  }, [user]);

  return favoritos;
}
