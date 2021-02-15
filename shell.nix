{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = [
    pkgs.nodejs-15_x

    # keep this line if you use bash
    pkgs.bashInteractive
  ];
}
