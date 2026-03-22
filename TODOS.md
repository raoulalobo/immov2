# TODOS — ImmoV2

## P1 — Post-déploiement immédiat

### Monitoring / alerting basique
- **Quoi** : Configurer Vercel Analytics (gratuit) + UptimeRobot (alerte email si site down)
- **Pourquoi** : Sans monitoring, un downtime non détecté tue la confiance des vendeurs
- **Effort** : S (CC: ~5min)
- **Dépend de** : Déploiement initial
- **Ajouté** : 2026-03-20 (Eng review)

### Email queue / fallback
- **Quoi** : Table `email_queue` pour logger les emails en échec + retry automatique au prochain cron
- **Pourquoi** : Un échec silencieux du service email (Resend/SendGrid) = vendeur qui pense que personne n'est intéressé. Les emails digest, alertes, et vérification sont critiques pour l'engagement.
- **Effort** : S (CC: ~15min)
- **Dépend de** : Système email fonctionnel
- **Implémentation** : Table `email_queue` (to, subject, body, status, attempts, next_retry_at). Le cron existant check la queue en plus de ses tâches normales.
- **Ajouté** : 2026-03-21 (Eng review)

## P2 — Post-lancement

### Estimation de prix du marché
- **Quoi** : Afficher un indicateur "Prix médian dans cette zone" sur chaque annonce (quand 5+ annonces comparables existent)
- **Pourquoi** : Différenciateur unique sur le marché camerounais, aide les acheteurs à évaluer si un prix est juste
- **Effort** : S (CC: ~15min)
- **Dépend de** : Volume d'annonces suffisant (50+ dans une même ville)
- **Implémentation** : Requête SQL médiane par ville+type de terrain, affichage conditionnel
- **Ajouté** : 2026-03-20 (CEO review)

### Upload vidéo résumable
- **Quoi** : Implémenter un upload vidéo résumable (tus protocol ou chunked upload) pour gérer les coupures 3G mid-upload
- **Pourquoi** : Sur 3G, un upload de 30 Mo peut prendre 2-3 min. Une coupure à 80% force l'utilisateur à tout recommencer — frustrant et potentiellement bloquant pour l'adoption
- **Effort** : M (CC: ~1h)
- **Dépend de** : Upload vidéo basique fonctionnel + feedback utilisateurs sur les échecs d'upload
- **Implémentation** : Client tus.js + proxy ou Supabase multipart upload. Évaluer si Supabase ajoute le support tus natif d'ici là.
- **Ajouté** : 2026-03-21 (Eng review)
