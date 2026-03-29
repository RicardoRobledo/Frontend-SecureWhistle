import { setFeatureDefinitions } from "framer-motion";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const MAIN_DOMAINS = import.meta.env.VITE_MAIN_DOMAINS.split(',').map((d: string) => d.trim())

export const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;

export const FEATURES = {
    'basic': ["Hasta 20 usuarios", "Hasta 10 denuncias por mes", "1 ciudad o sede", "Hasta 20 unidades de negocio o más",],
    'professional': ["Hasta 50 usuarios", "Hasta 30 denuncias por mes", "Hasta 10 ciudades o sedes", "Hasta 50 unidades de negocio o más",],
    'enterprise': ["Usuarios ilimitados", "Denuncias ilimitadas", "Ciudades o sedes ilimitadas", "Unidades de negocio ilimitadas",],
}

export const PLANS = [
    {
      name: "Business Basic",
      monthlyPrice: 149,
      annualPrice: 119,
      description: "Ideal para PYMES que inician su proceso de cumplimiento.",
      features: FEATURES.basic,
      highlight: false,
      buttonText: "Comenzar ahora"
    },
    {
      name: "Business Pro",
      monthlyPrice: 299,
      annualPrice: 239,
      description: "Control avanzado para empresas en crecimiento.",
      features: FEATURES.professional,
      highlight: true,
      buttonText: "Comenzar ahora"
    },
    {
      name: "Enterprise",
      monthlyPrice: 499,
      annualPrice: 399,
      description: "Solución integral para grandes corporativos y holdings.",
      features: FEATURES.enterprise,
      highlight: false,
      buttonText: "Comenzar ahora"
    }
];

export const PRICES = [
    {
        id: 'price_1SorwQDN7dnWLMCYP8tangWp',
        nickname: 'Plan Básico Mensual',
        unit_amount: 20000,
        currency: 'mxn',
        interval: 'month',
        planName: 'BASIC',
        frequency: 'MONTHLY',
        features: FEATURES.basic
    },
    {
        id: 'price_1Sos6TDN7dnWLMCYq63hXPbu',
        nickname: 'Plan Básico Anual',
        unit_amount: 25000,
        currency: 'mxn',
        interval: 'year',
        planName: 'BASIC',
        frequency: 'ANNUAL',
        features: FEATURES.basic
    },
    {
        id: 'price_1SoryXDN7dnWLMCYKZ94jqn3',
        nickname: 'Plan Profesional Mensual',
        unit_amount: 25000,
        currency: 'mxn',
        interval: 'month',
        planName: 'PROFESSIONAL',
        frequency: 'MONTHLY',
        features: FEATURES.professional
    },
    {
        id: 'price_1Sos6oDN7dnWLMCYcAwXiBti',
        nickname: 'Plan Profesional Anual',
        unit_amount: 30000,
        currency: 'mxn',
        interval: 'year',
        planName: 'PROFESSIONAL',
        frequency: 'ANNUAL',
        features: FEATURES.professional
    },
    {
        id: 'price_1Sos3YDN7dnWLMCYIDz25Dk3',
        nickname: 'Plan Empresarial Mensual',
        unit_amount: 30000,
        currency: 'mxn',
        interval: 'month',
        planName: 'ENTERPRISE',
        frequency: 'MONTHLY',
        features: FEATURES.enterprise
    },
    {
        id: 'price_1Sos77DN7dnWLMCYxY66mfMA',
        nickname: 'Plan Empresarial Anual',
        unit_amount: 35000,
        currency: 'mxn',
        interval: 'year',
        planName: 'ENTERPRISE',
        frequency: 'ANNUAL',
        features: FEATURES.enterprise
    }
];