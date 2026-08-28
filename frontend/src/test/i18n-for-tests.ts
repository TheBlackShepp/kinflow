import i18n from "../i18n";

// Force Spanish, matching the app's default backend locale, so tests have
// deterministic copy regardless of the CI/navigator language.
i18n.changeLanguage("es");
