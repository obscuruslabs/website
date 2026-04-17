{
  description = "obscurus labs — VISO .01 storefront";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            nodejs_22
            nodePackages.npm
            nodePackages.pnpm
            nodePackages.typescript
            nodePackages.typescript-language-server
            flyctl
            gh
          ];

          shellHook = ''
            echo "obscurus labs dev shell"
            echo "node $(node --version) | npm $(npm --version)"
            export NODE_ENV=development
          '';
        };

        packages.default = pkgs.buildNpmPackage rec {
          pname = "obscuruslabs";
          version = "0.1.0";
          src = ./.;
          npmDepsHash = ""; # compute with `nix run nixpkgs#prefetch-npm-deps package-lock.json`

          buildPhase = ''
            npm run build
          '';

          installPhase = ''
            mkdir -p $out
            cp -r .next/standalone/* $out/
            cp -r .next/static $out/.next/static
            cp -r public $out/public
          '';
        };
      }
    );
}
