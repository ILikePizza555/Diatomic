{ pkgs ? import <nixpkgs> {} }:

with pkgs;

pkgs.mkShell {
  buildInputs = [
    nodejs-15_x
    nodePackages.npm
    nodePackages.vue-cli
  ];

  shellHook = ''
    if [ ! -d node_modules ]; then
      npm install
    fi
    echo "run \"npm run serve\" to load local copy of service"
  '';
}
