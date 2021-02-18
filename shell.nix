{ pkgs ? import <nixpkgs> {} }:

with pkgs;

pkgs.mkShell {
  buildInputs = [
    nodejs-15_x
  ];

  shellHook = ''
    if [ ! -d node_modules ]; then
      npm install
      npm i @vue/cli
    fi
    echo "run \"npm run serve\" to load local copy of service"
    export PATH="./node_modules/.bin:$PATH";
  '';
}
