# Suivi quotidien des contrôles qualité

Application web HTML/CSS/JS pour le suivi des contrôles qualité en laboratoire.

## Fonctionnalités
- Liste quotidienne de contrôles à cocher
- Suivi par unité et spécialité
- Tableau de bord des résultats
- Historique exportable en CSV
- Authentification avec Supabase
- Gestion des comptes employé / responsable
- Paramétrage des analyses et appareils

## Démarrage rapide
1. Ouvrez `index.html` dans votre navigateur.
2. Configurez votre projet Supabase dans `app.js` si besoin.
3. Si vous utilisez Supabase, créez les tables `cq_profiles`, `cq_templates` et `cq_records` selon le schéma du projet.

## Fichiers
- `index.html` : structure principale
- `styles.css` : design complet
- `app.js` : logique applicative et intégration Supabase

## Déploiement
Ce projet est compatible avec :
- GitHub Pages
- Netlify
- Vercel
- tout hébergement statique

## Remarque
La version actuelle a été préparée pour une utilisation web statique, avec intégration Supabase déjà prête dans le code.
