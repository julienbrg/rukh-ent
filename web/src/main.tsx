import {
  ChakraProvider,
  createSystem,
  defaultConfig,
  defineConfig,
} from '@chakra-ui/react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { App } from './App';

const system = createSystem(
  defaultConfig,
  defineConfig({
    globalCss: {
      'html, body': { bg: 'black', color: 'white' },
      'a:not(.chakra-button)': { color: '#45a2f8' },
    },
    theme: {
      recipes: {
        button: {
          variants: {
            variant: {
              solid: {
                bg: '#8c1c84',
                color: 'white',
                _hover: { bg: '#701669' },
              },
            },
          },
        },
      },
    },
  }),
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ChakraProvider value={system}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ChakraProvider>
  </StrictMode>,
);
