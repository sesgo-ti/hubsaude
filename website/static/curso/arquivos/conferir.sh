#!/bin/bash
hubsaude validate "$1" > /dev/null
codigo=$?
if [ $codigo -ne 0 ] && [ $codigo -ne 2 ]; then
  echo "Envio interrompido (código $codigo)"
  exit 1
fi
echo "Registro sem erros: pode seguir para o envio"
