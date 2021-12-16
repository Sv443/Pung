import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';

export default {
  input: 'client/index.ts',
  output: {
    dir: 'out/client',
    format: 'cjs'
  },
  plugins: [commonjs(), nodeResolve()],
};
