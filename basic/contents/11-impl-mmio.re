= Memory-mapped I/Oの実装

TODO
#@# == 概要

#@# UART TX/RXを作ります

#@# == 実装方針

riscv64-unknown-elf-gcc -march=rv64imd -nostartfiles -W -T link.ld entry.S debug_output.c
riscv64-unknown-elf-objcopy -O binary a.out a.bin
python3 bin2hex.py 8 a.bin > debug_output.hex
make sim VERILATOR_FLAGS="-DENABLE_TEST_OUTPUT --trace --trace-params --trace-structs --trace-underscore
-DPRINT_DEBUG"

