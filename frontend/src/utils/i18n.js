// Dicionário i18n para os Portais Captivos e Telas Públicas

export const translations = {
  pt: {
    welcome: "Bem-vindo ao Wi-Fi",
    connect_instruction: "Preencha seus dados para liberar a navegação de alta velocidade.",
    name: "Nome Completo",
    phone: "WhatsApp / Celular",
    email: "E-mail",
    cpf: "CPF / Documento",
    connect_button: "Liberar Acesso Wi-Fi",
    accept_lgpd: "Concordo com os Termos de Uso e Política de Privacidade de Dados (LGPD).",
    select_plan: "Escolha seu Pacote de Acesso",
    login_social: "Ou conecte-se com sua rede social",
    connecting: "Conectando ao Wi-Fi...",
    success: "Conexão Liberada!",
    powered_by: "Tecnologia Hotspot por NuvyCore",
    footer_text: "Seus dados estão protegidos e serão utilizados apenas para liberação do acesso Wi-Fi.",
    language_name: "Português",
    lang_flag: "🇧🇷"
  },
  en: {
    welcome: "Welcome to Wi-Fi",
    connect_instruction: "Enter your information below to unlock high-speed internet access.",
    name: "Full Name",
    phone: "Phone / WhatsApp",
    email: "E-mail Address",
    cpf: "Passport / ID Number",
    connect_button: "Connect to Wi-Fi",
    accept_lgpd: "I agree to the Terms of Service and Privacy Policy (GDPR / LGPD).",
    select_plan: "Select Your Access Plan",
    login_social: "Or connect with your social account",
    connecting: "Connecting to Wi-Fi...",
    success: "Access Granted!",
    powered_by: "Hotspot Technology by NuvyCore",
    footer_text: "Your data is protected and used solely to grant Wi-Fi access.",
    language_name: "English",
    lang_flag: "🇺🇸"
  },
  es: {
    welcome: "Bienvenido a la red Wi-Fi",
    connect_instruction: "Complete sus datos a continuación para liberar el acceso a internet de alta velocidad.",
    name: "Nombre Completo",
    phone: "Teléfono / WhatsApp",
    email: "Correo Electrónico",
    cpf: "Pasaporte / Documento",
    connect_button: "Conectar a la Red Wi-Fi",
    accept_lgpd: "Acepto los Términos de Uso y la Política de Privacidad de Datos.",
    select_plan: "Elija su Plan de Acceso",
    login_social: "O conéctese con su red social",
    connecting: "Conectando al Wi-Fi...",
    success: "¡Acceso Concedido!",
    powered_by: "Tecnología Hotspot por NuvyCore",
    footer_text: "Sus datos están protegidos y se utilizarán únicamente para otorgar acceso a Wi-Fi.",
    language_name: "Español",
    lang_flag: "🇪🇸"
  }
};

export function getInitialLanguage() {
  const saved = localStorage.getItem("nuvycore_portal_lang");
  if (saved && translations[saved]) return saved;

  const browserLang = navigator.language || navigator.userLanguage || "pt";
  if (browserLang.startsWith("es")) return "es";
  if (browserLang.startsWith("en")) return "en";
  return "pt";
}

export function setPortalLanguage(lang) {
  if (translations[lang]) {
    localStorage.setItem("nuvycore_portal_lang", lang);
  }
}
