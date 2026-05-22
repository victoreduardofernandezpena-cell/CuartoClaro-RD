# Firebase Setup

1. Crea un proyecto en Firebase Console llamado `CuartoClaroRD`.
2. En Authentication, activa `Google` y `Email/Password`.
3. En Firestore Database, crea la base de datos.
4. En Project settings, registra una app Web.
5. Copia el objeto `firebaseConfig` que te da Firebase.
6. Pega esos valores en `firebase-config.js`.
7. En Firestore Rules, usa el contenido de `firestore.rules`.

La app guarda los datos en:

```txt
usuarios/{userId}
  appState
    monthlyBudget
    categories
    goals
    expenses
    chartMode
    dark
```

Si `firebase-config.js` tiene valores de ejemplo, la app funciona en modo local usando el navegador actual.
