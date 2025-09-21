
run:
	yarn run docs:dev --host

build:
	rm -rf dist ../webroot
	yarn run docs:build
	mv ./.vitepress/dist ../webroot
	
import:
	cp -R ../veryl-riscv-book-md/* contents/
	cp -R ../images contents/images

clean:
	rm -rf dist

.PHONY: run build import clean