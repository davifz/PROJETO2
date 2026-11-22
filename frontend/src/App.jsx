import { Route, Routes } from 'react-router-dom';
import Layout from './components/layout/Layout.jsx';
import { RotaProtegida, RotaPublica } from './components/layout/RotaProtegida.jsx';
import Login from './components/paginas/Login.jsx';
import Cadastro from './components/paginas/Cadastro.jsx';
import Painel from './components/paginas/Painel.jsx';
import Lancamentos from './components/paginas/Lancamentos.jsx';
import Categorias from './components/paginas/Categorias.jsx';
import FontesDestinos from './components/paginas/FontesDestinos.jsx';
import Relatorios from './components/paginas/Relatorios.jsx';
import Faturas from './components/paginas/Faturas.jsx';
import SaudeFinanceira from './components/paginas/SaudeFinanceira.jsx';
import NaoEncontrada from './components/paginas/NaoEncontrada.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<RotaPublica><Login /></RotaPublica>} />
      <Route path="/cadastro" element={<RotaPublica><Cadastro /></RotaPublica>} />

      <Route element={<RotaProtegida><Layout /></RotaProtegida>}>
        <Route index element={<Painel />} />
        <Route path="lancamentos" element={<Lancamentos />} />
        <Route path="categorias" element={<Categorias />} />
        <Route path="fontes-destinos" element={<FontesDestinos />} />
        <Route path="relatorios" element={<Relatorios />} />
        <Route path="faturas" element={<Faturas />} />
        <Route path="saude-financeira" element={<SaudeFinanceira />} />
      </Route>

      <Route path="*" element={<NaoEncontrada />} />
    </Routes>
  );
}
