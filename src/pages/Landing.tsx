import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Check, Menu, X } from 'lucide-react';

const Landing = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAnnual, setIsAnnual] = useState(false); // Estado para el toggle

  const handleScroll = (e, id) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const plans = [
    {
      name: "Business Basic",
      monthlyPrice: 149,
      annualPrice: 119, // Precio rebajado por mes si paga el año
      description: "Ideal para PYMES que inician su proceso de cumplimiento.",
      features: ["Hasta 20 usuarios", "Hasta 10 denuncias por mes", "1 ciudad o sede", "Hasta 20 unidades de negocio o más", "15 análisis forenses por mes",],
      highlight: false,
      buttonText: "Comenzar ahora"
    },
    {
      name: "Business Pro",
      monthlyPrice: 299,
      annualPrice: 239,
      description: "Control avanzado para empresas en crecimiento.",
      features: ["Hasta 50 usuarios", "Hasta 30 denuncias por mes", "Hasta 10 ciudades o sedes", "Hasta 50 unidades de negocio o más", "30 análisis forenses por mes",],
      highlight: true,
      buttonText: "Comenzar ahora"
    },
    {
      name: "Enterprise",
      monthlyPrice: 499,
      annualPrice: 399,
      description: "Solución integral para grandes corporativos y holdings.",
      features: ["Usuarios ilimitados", "Denuncias ilimitadas", "Ciudades o sedes ilimitadas", "Unidades de negocio ilimitadas", "70 análisis forenses por mes",],
      highlight: false,
      buttonText: "Comenzar ahora"
    }
  ];

  return (
    <div className="min-h-screen bg-[#0B1120] text-white font-sans selection:bg-blue-500 scroll-smooth">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-6 py-4 md:px-12 border-b border-gray-800 sticky top-0 bg-[#0B1120]/80 backdrop-blur-md z-50">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-2 rounded-lg text-white">
            <Shield size={24} />
          </div>
          <span className="text-xl font-bold tracking-tight">SecureWhistle</span>
        </div>
        
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-300">
          <a href="#" className="hover:text-blue-400 transition">Producto</a>
          <a href="#" className="hover:text-blue-400 transition">Soluciones</a>
          <a href="#planes" onClick={(e) => handleScroll(e, 'planes')} className="hover:text-blue-400 transition">Planes</a>
          <Link to="/verify-portal">
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-full transition shadow-lg shadow-blue-900/20">
              Iniciar Sesión
            </button>
          </Link>
        </div>

        <button className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? <X /> : <Menu />}
        </button>
      </nav>

      {/* Hero Section */}
      <header className="px-6 pt-20 pb-16 md:pt-32 md:pb-24 text-center max-w-5xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-blue-900/30 border border-blue-500/30 px-4 py-1.5 rounded-full text-blue-400 text-sm mb-6">
           <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </span>
          Nueva Inteligencia Forense v1.0
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold mb-6 tracking-tight leading-tight">
          Transparencia Corporativa <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
            Impulsada por IA
          </span>
        </h1>
        <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
          La plataforma integral para la gestión ética y segura de reportes. Garantizamos la protección de datos y el anonimato.
        </p>
        <div className="flex flex-col md:flex-row gap-4 justify-center items-center">
          <Link to="/register">
          <button className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 px-8 py-4 rounded-xl font-bold text-lg transition shadow-xl shadow-blue-900/40">
            Registrarse
          </button>
          </Link>
          <button className="w-full md:w-auto bg-gray-800 hover:bg-gray-700 px-8 py-4 rounded-xl font-bold text-lg transition border border-gray-700">
            Ver Casos de Éxito
          </button>
        </div>
      </header>

      {/* Pricing Section */}
      <section className="px-6 py-20 bg-[#0F172A] scroll-mt-20">
        <div id="planes" className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Planes diseñados para cada escala</h2>
          <p className="text-gray-400 mb-10">Cumplimiento normativo y seguridad forense al alcance de tu organización.</p>

          {/* Toggle Anual/Mensual */}
          <div className="flex items-center justify-center gap-4 mb-16">
            <span className={`text-sm ${!isAnnual ? 'text-white font-bold' : 'text-gray-500'}`}>Mensual</span>
            <button 
              onClick={() => setIsAnnual(!isAnnual)}
              className="w-14 h-7 bg-gray-700 rounded-full p-1 transition-colors duration-300 focus:outline-none"
            >
              <div className={`w-5 h-5 bg-blue-500 rounded-full transition-transform duration-300 ${isAnnual ? 'translate-x-7' : 'translate-x-0'}`} />
            </button>
            <span className={`text-sm ${isAnnual ? 'text-white font-bold' : 'text-gray-500'}`}>Anual</span>
            <span className="ml-2 bg-emerald-500/10 text-emerald-500 text-xs font-bold px-2 py-1 rounded-full border border-emerald-500/20">
              Ahorra 20%
            </span>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan, index) => (
              <div 
                key={index}
                className={`relative p-8 rounded-3xl border text-left transition-all duration-300 hover:-translate-y-2 ${
                  plan.highlight 
                    ? 'bg-gradient-to-b from-[#1E293B] to-[#0F172A] border-blue-500 shadow-2xl shadow-blue-900/20 scale-105 z-10' 
                    : 'bg-[#111827] border-gray-800'
                }`}
              >
                {plan.highlight && (
                  <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-xs font-bold uppercase tracking-widest px-4 py-1 rounded-full text-white">
                    Recomendado
                  </span>
                )}
                <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                <div className="mb-6">
                  <span className="text-4xl font-bold">
                    ${isAnnual ? plan.annualPrice : plan.monthlyPrice}
                  </span>
                  <span className="text-gray-400 ml-2 text-sm">USD/mes</span>
                  {isAnnual && <p className="text-xs text-blue-400 mt-1 font-medium">Facturado anualmente</p>}
                </div>
                <p className="text-sm text-gray-400 mb-8 min-h-[40px]">{plan.description}</p>
                
                <ul className="space-y-4 mb-10 text-sm">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3 text-gray-300">
                      <Check size={18} className="text-emerald-500 shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer / Certs */}
      <footer className="px-6 py-16 text-center border-t border-gray-800 bg-[#0B1120]">
        <p className="text-gray-500 uppercase tracking-widest text-xs font-bold mb-8">Certificados bajo estándares internacionales</p>
        <div className="flex flex-wrap justify-center gap-8 opacity-50 grayscale hover:grayscale-0 transition duration-500">
          <div className="text-xl font-bold">ISO 37001</div>
          <div className="text-xl font-bold">GDPR COMPLIANT</div>
          <div className="text-xl font-bold">SOC2 TYPE II</div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;