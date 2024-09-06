pdf: #preproc
	sudo docker run --rm -v $(PWD):/work -w /work kauplan/review2.5 rake pdf

clean:
	sudo docker run --rm -v $(PWD):/work -w /work kauplan/review2.5 rake clean

preproc: extract-tags
	sh preproc.sh

extract-tags:
	cd .. && git extract-tags riscv-book- bluecore --src-base riscv-book/scripts --add-ignore

ub:
	cd .. && sh update.sh

.PHONY: pdf clean preproc extract-tags


