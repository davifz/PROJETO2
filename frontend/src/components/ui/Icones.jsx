function Icone({ children, tamanho = 20, ...props }) {
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export const IconePainel = (p) => (
  <Icone {...p}><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></Icone>
);
export const IconeLancamentos = (p) => (
  <Icone {...p}><path d="M7 4v16M7 4 3.5 7.5M7 4l3.5 3.5" /><path d="M17 20V4m0 16-3.5-3.5M17 20l3.5-3.5" /></Icone>
);
export const IconeCategorias = (p) => (
  <Icone {...p}><path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9-9-9Z" /><circle cx="8" cy="8" r="1.5" /></Icone>
);
export const IconeCarteira = (p) => (
  <Icone {...p}><path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3" /><path d="M21 8h-5a3 3 0 0 0 0 6h5V8Z" /><circle cx="16" cy="11" r=".6" fill="currentColor" /></Icone>
);
export const IconeRelatorios = (p) => (
  <Icone {...p}><path d="M21 12A9 9 0 1 1 12 3" /><path d="M12 3a9 9 0 0 1 9 9h-9V3Z" /></Icone>
);
export const IconeCartao = (p) => (
  <Icone {...p}><rect x="2.5" y="5" width="19" height="14" rx="2.5" /><path d="M2.5 10h19M6.5 15h4" /></Icone>
);
export const IconeSaude = (p) => (
  <Icone {...p}><path d="M20.8 6.6a5 5 0 0 0-8.1-1.4L12 6l-.7-.8a5 5 0 1 0-7.1 7.1L12 20l7.8-7.7a5 5 0 0 0 1-5.7Z" /><path d="M3.5 12h4l2-3 3 6 2-3h6" /></Icone>
);
export const IconeSair = (p) => (
  <Icone {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5M21 12H9" /></Icone>
);
export const IconeMais = (p) => <Icone {...p}><path d="M12 5v14M5 12h14" /></Icone>;
export const IconeEditar = (p) => (
  <Icone {...p}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" /></Icone>
);
export const IconeLixeira = (p) => (
  <Icone {...p}><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /></Icone>
);
export const IconeAnterior = (p) => <Icone {...p}><path d="m15 18-6-6 6-6" /></Icone>;
export const IconeProximo = (p) => <Icone {...p}><path d="m9 18 6-6-6-6" /></Icone>;
export const IconeMenu = (p) => <Icone {...p}><path d="M4 6h16M4 12h16M4 18h16" /></Icone>;
export const IconeFechar = (p) => <Icone {...p}><path d="M18 6 6 18M6 6l12 12" /></Icone>;
export const IconeAlerta = (p) => (
  <Icone {...p}><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4M12 17h.01" /></Icone>
);
export const IconeInfo = (p) => <Icone {...p}><circle cx="12" cy="12" r="9" /><path d="M12 16v-4M12 8h.01" /></Icone>;
export const IconeCheck = (p) => <Icone {...p}><path d="M20 6 9 17l-5-5" /></Icone>;
export const IconeSetaCima = (p) => <Icone {...p}><path d="M12 19V5M5 12l7-7 7 7" /></Icone>;
export const IconeSetaBaixo = (p) => <Icone {...p}><path d="M12 5v14M19 12l-7 7-7-7" /></Icone>;
export const IconeSaldo = (p) => <Icone {...p}><path d="M3 17l6-6 4 4 8-8" /><path d="M14 7h7v7" /></Icone>;
export const IconeBanco = (p) => (
  <Icone {...p}><path d="M3 10h18L12 4 3 10Z" /><path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 21h18" /></Icone>
);
export const IconeRenda = (p) => (
  <Icone {...p}><circle cx="12" cy="12" r="9" /><path d="M14.8 9.2c-.5-.8-1.5-1.2-2.8-1.2-1.7 0-2.8.8-2.8 2s1.1 1.6 2.8 2 2.8.9 2.8 2.1-1.2 2-2.8 2c-1.3 0-2.4-.5-2.9-1.3M12 6.5V8M12 16v1.5" /></Icone>
);
export const IconeVazio = (p) => (
  <Icone tamanho={40} strokeWidth="1.4" {...p}><path d="M3 7l9-4 9 4-9 4-9-4Z" /><path d="M3 7v10l9 4 9-4V7" /><path d="M12 11v10" /></Icone>
);
