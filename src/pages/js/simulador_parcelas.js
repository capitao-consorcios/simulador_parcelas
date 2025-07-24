(function () {
  console.log(
    "[Simulador Parcelas] Script carregado. Iniciando configuração (dentro da IIFE)..."
  );

  const PORTO_LANCE_FIXO_PERCENTUAL = 0.4;
  const PORTO_EMBUTIDO_IMOVEL_PERCENTUAL = 0.3;
  const PORTO_AUTO_VALOR_CORTE_EMBUTIDO = 180000;

  const YAMAHA_LANCE_FIXO_IMOVEL_SALDO_DEVEDOR_PERCENTUAL = 0.3;
  const YAMAHA_LANCE_FIXO_IMOVEL_EMBUTIDO_AUXILIAR_CREDITO_PERCENTUAL = 0.25;
  const YAMAHA_LANCE_FIXO_AUTO_VAGA_EXCLUSIVA_SALDO_DEVEDOR_PERCENTUAL = 0.25;
  const YAMAHA_LANCE_FIXO_AUTO_VAGA_EXCLUSIVA_EMBUTIDO_AUXILIAR_CREDITO_PERCENTUAL = 0.15;
  const YAMAHA_EMBUTIDO_LIVRE_IMOVEL_CREDITO_PERCENTUAL = 0.25;
  const YAMAHA_EMBUTIDO_LIVRE_AUTO_CREDITO_PERCENTUAL = 0.15;

  let ultimoResultadoParaPdf = null;

  function formatarMoeda(valor) {
    if (typeof valor !== "number" || isNaN(valor)) return "R$ --";
    return valor.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function handleCurrencyInput(event) {
    const input = event.target;
    let digitsOnly = input.value.replace(/\D/g, "");

    if (digitsOnly === "") {
      input.value = "";
      return;
    }

    const valueAsNumber = parseInt(digitsOnly, 10) / 100;

    input.value = new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(valueAsNumber);
  }
  function formatPercentFromDigits(digitsAndMaybeSeparator, precision = 2) {
    if (
      digitsAndMaybeSeparator === null ||
      typeof digitsAndMaybeSeparator === "undefined"
    )
      return ``;
    let [integerPart = "0", decimalPart = ""] = String(
      digitsAndMaybeSeparator
    ).split(",");
    if (integerPart.length > 1 && integerPart.startsWith("0")) {
      integerPart = integerPart.replace(/^0+/, "");
      if (integerPart.length === 0) integerPart = "0";
    }
    if (
      integerPart.length === 0 &&
      String(digitsAndMaybeSeparator).startsWith(",")
    )
      integerPart = "0";
    decimalPart = decimalPart.padEnd(precision, "0").substring(0, precision);
    return `${integerPart},${decimalPart}`;
  }
  function getNumericValue(value, dataType) {
    if (typeof value !== "string" || !value) return NaN;

    if (dataType === "currency") {
      const digitsOnly = value.replace(/\D/g, "");
      if (digitsOnly === "") return NaN;

      const numberValue = parseFloat(digitsOnly) / 100;
      return isNaN(numberValue) ? NaN : numberValue;
    } else if (dataType === "percent") {
      const cleanedValue = value.replace("%", "").replace(",", ".").trim();
      const num = parseFloat(cleanedValue);
      return isNaN(num) ? NaN : num;
    }

    const num = parseFloat(value);
    return isNaN(num) ? NaN : num;
  }

  function handlePercentInputEvent(event) {
    const input = event.target;
    let cursorPos = input.selectionStart;
    const originalValue = input.value;
    const precision = parseInt(input.dataset.precision, 10) || 2;
    let rawValue = input.value;
    let justDigitsAndSeparator = rawValue.replace(/[^\d,.]/g, "");
    const firstSeparatorIndex = justDigitsAndSeparator.search(/[,.]/);

    if (firstSeparatorIndex !== -1) {
      let integerPart = justDigitsAndSeparator.substring(
        0,
        firstSeparatorIndex
      );
      let decimalPart = justDigitsAndSeparator
        .substring(firstSeparatorIndex + 1)
        .replace(/[.,]/g, "");
      justDigitsAndSeparator =
        integerPart + "," + decimalPart.substring(0, precision);
    }
    input.value = justDigitsAndSeparator;
    let diff = input.value.length - originalValue.length;
    let newCursorPos = cursorPos + diff;
    if (
      originalValue.length > input.value.length &&
      originalValue[cursorPos - 1] === ","
    ) {
      newCursorPos = cursorPos - 1;
    } else if (cursorPos === originalValue.length && diff > 0) {
      newCursorPos = input.value.length;
    }
    try {
      if (input.value !== originalValue)
        input.setSelectionRange(newCursorPos, newCursorPos);
    } catch (e) {}
  }
  function handleFinalFormattingOnBlur(event) {
    const input = event.target;
    const dataType = input.dataset.type;
    let value = input.value;

    if (
      value.trim() === "" ||
      value.trim() === "R$" ||
      value.trim() === "," ||
      value.trim() === "%"
    ) {
      const isOptionalZeroField =
        input.id.includes("RedutorParcela") ||
        input.id.includes("Adesao") ||
        input.id.includes("FundoReserva") ||
        input.id.includes("SeguroVida") ||
        input.id.includes("Embutido");
      if (isOptionalZeroField) {
        if (dataType === "percent") {
          input.value =
            formatPercentFromDigits(
              "0",
              parseInt(input.dataset.precision, 10) || 2
            ) + "%";
        } else if (dataType === "currency" && input.id.includes("Embutido")) {
          input.value = formatarMoeda(0);
        } else input.value = "";
      } else {
        input.value = "";
      }
      return;
    }
    let numericValue = getNumericValue(value, dataType);
    if (isNaN(numericValue)) {
      const isOptionalZeroFieldOnError =
        input.id.includes("RedutorParcela") ||
        input.id.includes("Adesao") ||
        input.id.includes("FundoReserva") ||
        input.id.includes("SeguroVida") ||
        input.id.includes("Embutido");
      if (isOptionalZeroFieldOnError) {
        if (dataType === "percent")
          input.value =
            formatPercentFromDigits(
              "0",
              parseInt(input.dataset.precision, 10) || 2
            ) + "%";
        else if (dataType === "currency" && input.id.includes("Embutido"))
          input.value = formatarMoeda(0);
        else input.value = "";
      } else {
        input.value = "";
      }
      return;
    }
    const minAttr = input.getAttribute("min");
    if (minAttr && numericValue < parseFloat(minAttr)) {
      numericValue = parseFloat(minAttr);
    }
    const maxAttr = input.getAttribute("max");
    if (maxAttr && numericValue > parseFloat(maxAttr)) {
      numericValue = parseFloat(maxAttr);
    }
    if (dataType === "currency") {
      input.value = formatarMoeda(numericValue);
    } else if (dataType === "percent") {
      const precision = parseInt(input.dataset.precision, 10) || 2;
      input.value = numericValue.toFixed(precision).replace(".", ",") + "%";
    }
  }

  const opcaoLanceFixoItauImovelDiv = document.getElementById(
    "opcaoLanceFixoItauImovel"
  );
  const opcaoLanceLivreItauDiv = document.getElementById("opcaoLanceLivreItau");
  const opcaoLanceItauDiv = document.getElementById("opcaoLanceItau");
  const tipoLanceItauRadio = document.getElementById("tipoLanceItau");
  const camposLanceItauDiv = document.getElementById("camposLanceItau");
  const percentualLanceProprioItauInput = document.getElementById(
    "percentualLanceProprioItau"
  );
  const percentualLanceEmbutidoItauInput = document.getElementById(
    "percentualLanceEmbutidoItau"
  );
  const opcaoLanceFixoAutomovelYamahaDiv = document.getElementById(
    "opcaoLanceFixoAutomovelYamaha"
  );
  const tipoLanceFixoAutomovelYamahaRadio = document.getElementById(
    "tipoLanceFixoAutomovelYamaha"
  );
  const containerYamahaAutomovelOpcoesFixoDiv = document.getElementById(
    "containerYamahaAutomovelOpcoesFixo"
  );
  const yamahaAutomovelPercentualFixoSelect = document.getElementById(
    "yamahaAutomovelPercentualFixo"
  );
  const resultadoNomeClienteSpan = document.getElementById(
    "resultadoNomeCliente"
  );
  const containerAdesao = document.getElementById("containerAdesao");
  const footerValorParcelasAdesao = document.getElementById(
    "footerValorParcelasAdesao"
  );
  const footerSeguroDeVida = document.getElementById("footerSeguroDeVida");
  const resultadoCreditoContratadoSpan = document.getElementById(
    "resultadoCreditoContratado"
  );
  const containerCreditoLiquidoDiv = document.getElementById(
    "containerCreditoLiquido"
  );
  const containerParcelaComRedutorDiv = document.getElementById(
    "containerParcelaComRedutor"
  );
  const resultadoSeguroDeVidaSpan = document.getElementById(
    "resultadoSeguroDeVida"
  );
  const resultadoPercentualLanceSpan = document.getElementById(
    "resultadoPercentualLance"
  );
  const containerParcelasAdesaoDiv = document.getElementById(
    "containerParcelasAdesao"
  );
  const resultadoParcelasAdesaoSpan = document.getElementById(
    "resultadoParcelasAdesao"
  );
  const resultadoParcelasRestantesSpan = document.getElementById(
    "resultadoParcelasRestantes"
  );
  const adminRadios = document.querySelectorAll('input[name="administradora"]');
  const selecaoTipoBemDiv = document.getElementById("selecaoTipoBem");
  const tipoBemRadios = document.querySelectorAll('input[name="tipoBem"]');
  const dadosClienteTipoDiv = document.getElementById("dadosClienteTipo");
  const allAdminBemFieldsDivs = document.querySelectorAll(
    ".administradora-bem-fields"
  );
  const dadosLanceDiv = document.getElementById("dadosLance");
  const tituloDadosLanceH2 = document.getElementById("tituloDadosLance");
  const containerPortoPercentualEmbutido = document.getElementById(
    "containerPortoPercentualEmbutido"
  );
  const portoAutomovelPercentualEmbutido = document.getElementById(
    "portoAutomovelPercentualEmbutido"
  );
  const containerTipoLance = document.getElementById("containerTipoLance");
  const labelTipoLance = document.getElementById("labelTipoLance");
  const portoImovelValorCreditoInput = document.getElementById(
    "portoImovelValorCredito"
  );
  const portoAutomovelValorCreditoInput = document.getElementById(
    "portoAutomovelValorCredito"
  );
  const portoAutomovelAlertaLanceDiv = document.getElementById(
    "portoAutomovelAlertaLance"
  );
  const yamahaImovelValorCreditoInput = document.getElementById(
    "yamahaImovelValorCredito"
  );
  const yamahaAutomovelValorCreditoInput = document.getElementById(
    "yamahaAutomovelValorCredito"
  );
  const tipoLanceNenhumRadio = document.getElementById("tipoLanceNenhum");
  const opcaoLanceLivreGeralPortoDiv = document.getElementById(
    "opcaoLanceLivreGeralPorto"
  );
  const tipoLanceLivreRadio = document.getElementById("tipoLanceLivre");
  const opcaoLanceFixoImovelPortoDiv = document.getElementById(
    "opcaoLanceFixoImovelPorto"
  );
  const tipoLanceFixoPortoImovelRadio = document.getElementById(
    "tipoLanceFixoPortoImovel"
  );
  const opcaoLanceFixoAutomovelPortoDiv = document.getElementById(
    "opcaoLanceFixoAutomovelPorto"
  );
  const tipoLanceFixoPortoAutomovelRadio = document.getElementById(
    "tipoLanceFixoPortoAutomovel"
  );
  const camposLanceFixoPortoDiv = document.getElementById(
    "camposLanceFixoPorto"
  );
  const valorCalculadoLanceFixoPortoSpan = document.getElementById(
    "valorCalculadoLanceFixoPorto"
  );
  const valorEscondidoLanceFixoPortoInput = document.getElementById(
    "valorEscondidoLanceFixoPorto"
  );
  const usarEmbutidoLanceFixoPortoCheckbox = document.getElementById(
    "usarEmbutidoLanceFixoPorto"
  );
  const labelUsarEmbutidoLanceFixoPorto = document.getElementById(
    "labelUsarEmbutidoLanceFixoPorto"
  );
  const detalhesEmbutidoLanceFixoPortoDiv = document.getElementById(
    "detalhesEmbutidoLanceFixoPorto"
  );
  const maximoEmbutidoFixoPortoValorSpan = document.getElementById(
    "maximoEmbutidoFixoPortoValor"
  );
  const valorEmbutidoLanceFixoPortoUsarInput = document.getElementById(
    "valorEmbutidoLanceFixoPortoUsar"
  );
  const avisoMaxEmbutidoLanceFixoPortoSmall = document.getElementById(
    "avisoMaxEmbutidoLanceFixoPorto"
  );
  const camposLanceLivreDiv = document.getElementById("camposLanceLivre");
  const valorLanceLivreInput = document.getElementById("valorLanceLivre");
  const percentualLanceLivreInput = document.getElementById(
    "percentualLanceLivre"
  );
  const usarEmbutidoLanceLivreCheckbox = document.getElementById(
    "usarEmbutidoLanceLivre"
  );
  const labelUsarEmbutidoLanceLivre = document.getElementById(
    "labelUsarEmbutidoLanceLivre"
  );
  const detalhesEmbutidoLanceLivreDiv = document.getElementById(
    "detalhesEmbutidoLanceLivre"
  );
  const maximoEmbutidoLivreValorSpan = document.getElementById(
    "maximoEmbutidoLivreValor"
  );
  const valorEmbutidoLanceLivreUsarInput = document.getElementById(
    "valorEmbutidoLanceLivreUsar"
  );
  const avisoMaxEmbutidoLanceLivreSmall = document.getElementById(
    "avisoMaxEmbutidoLanceLivre"
  );
  const opcaoLanceLivreYamahaDiv = document.getElementById(
    "opcaoLanceLivreYamaha"
  );
  const tipoLanceLivreYamahaRadio = document.getElementById(
    "tipoLanceLivreYamaha"
  );
  const opcaoLanceFixoImovelYamahaDiv = document.getElementById(
    "opcaoLanceFixoImovelYamaha"
  );
  const tipoLanceFixoImovelYamahaRadio = document.getElementById(
    "tipoLanceFixoImovelYamaha"
  );
  const opcaoLanceFixoVagaExclusivaYamahaAutomovelDiv = document.getElementById(
    "opcaoLanceFixoVagaExclusivaYamahaAutomovel"
  );
  const tipoLanceFixoVagaExclusivaYamahaAutomovelRadio =
    document.getElementById("tipoLanceFixoVagaExclusivaYamahaAutomovel");
  const camposLanceLivreYamahaDiv = document.getElementById(
    "camposLanceLivreYamaha"
  );
  const valorLanceLivreYamahaInput = document.getElementById(
    "valorLanceLivreYamaha"
  );
  const percentualLanceLivreYamahaInput = document.getElementById(
    "percentualLanceLivreYamaha"
  );
  const usarEmbutidoLanceLivreYamahaCheckbox = document.getElementById(
    "usarEmbutidoLanceLivreYamaha"
  );
  const labelUsarEmbutidoLanceLivreYamaha = document.getElementById(
    "labelUsarEmbutidoLanceLivreYamaha"
  );
  const detalhesEmbutidoLanceLivreYamahaDiv = document.getElementById(
    "detalhesEmbutidoLanceLivreYamaha"
  );
  const maximoEmbutidoLivreYamahaValorSpan = document.getElementById(
    "maximoEmbutidoLivreYamahaValor"
  );
  const valorEmbutidoLanceLivreYamahaUsarInput = document.getElementById(
    "valorEmbutidoLanceLivreYamahaUsar"
  );
  const avisoMaxEmbutidoLanceLivreYamahaSmall = document.getElementById(
    "avisoMaxEmbutidoLanceLivreYamaha"
  );
  const camposLanceFixoImovelYamahaDiv = document.getElementById(
    "camposLanceFixoImovelYamaha"
  );
  const valorCalculadoLanceFixoImovelYamahaSpan = document.getElementById(
    "valorCalculadoLanceFixoImovelYamaha"
  );
  const valorEscondidoLanceFixoImovelYamahaInput = document.getElementById(
    "valorEscondidoLanceFixoImovelYamaha"
  );
  const usarEmbutidoFixoImovelYamahaCheckbox = document.getElementById(
    "usarEmbutidoFixoImovelYamaha"
  );
  const labelUsarEmbutidoFixoImovelYamaha = document.getElementById(
    "labelUsarEmbutidoFixoImovelYamaha"
  );
  const detalhesEmbutidoFixoImovelYamahaDiv = document.getElementById(
    "detalhesEmbutidoFixoImovelYamaha"
  );
  const maximoEmbutidoFixoImovelYamahaValorSpan = document.getElementById(
    "maximoEmbutidoFixoImovelYamahaValor"
  );
  const valorEmbutidoFixoImovelYamahaUsarInput = document.getElementById(
    "valorEmbutidoFixoImovelYamahaUsar"
  );
  const avisoMaxEmbutidoFixoImovelYamahaSmall = document.getElementById(
    "avisoMaxEmbutidoFixoImovelYamaha"
  );
  const camposLanceFixoVagaExclusivaYamahaAutomovelDiv =
    document.getElementById("camposLanceFixoVagaExclusivaYamahaAutomovel");
  const valorCalculadoLanceFixoVagaExclusivaYamahaAutomovelSpan =
    document.getElementById(
      "valorCalculadoLanceFixoVagaExclusivaYamahaAutomovel"
    );
  const valorEscondidoLanceFixoVagaExclusivaYamahaAutomovelInput =
    document.getElementById(
      "valorEscondidoLanceFixoVagaExclusivaYamahaAutomovel"
    );
  const usarEmbutidoFixoVagaExclusivaYamahaAutomovelCheckbox =
    document.getElementById("usarEmbutidoFixoVagaExclusivaYamahaAutomovel");
  const labelUsarEmbutidoFixoVagaExclusivaYamahaAutomovel =
    document.getElementById(
      "labelUsarEmbutidoFixoVagaExclusivaYamahaAutomovel"
    );
  const detalhesEmbutidoFixoVagaExclusivaYamahaAutomovelDiv =
    document.getElementById("detalhesEmbutidoFixoVagaExclusivaYamahaAutomovel");
  const maximoEmbutidoFixoVagaExclusivaYamahaAutomovelValorSpan =
    document.getElementById(
      "maximoEmbutidoFixoVagaExclusivaYamahaAutomovelValor"
    );
  const valorEmbutidoFixoVagaExclusivaYamahaAutomovelUsarInput =
    document.getElementById(
      "valorEmbutidoFixoVagaExclusivaYamahaAutomovelUsar"
    );
  const avisoMaxEmbutidoFixoVagaExclusivaYamahaAutomovelSmall =
    document.getElementById("avisoMaxEmbutidoFixoVagaExclusivaYamahaAutomovel");
  const formaAbatimentoLanceContainerDiv = document.getElementById(
    "formaAbatimentoLanceContainer"
  );
  const formaAbatimentoLanceSelect = document.getElementById(
    "formaAbatimentoLance"
  );
  const mesesPagosAntesDoLanceInput = document.getElementById(
    "mesesPagosAntesDoLance"
  );
  const btnSimular = document.getElementById("btnSimular");
  const erroSimulacaoP = document.getElementById("erroSimulacao");
  const areaResultadosSimulacaoDiv = document.getElementById(
    "areaResultadosSimulacao"
  );
  const nomeAdminResultadoSpan = document.getElementById("nomeAdminResultado");
  const tipoBemResultadoSpan = document.getElementById("tipoBemResultado");
  const resultadoTipoClienteSpan = document.getElementById(
    "resultadoTipoCliente"
  );
  const resultadoParcelaPuraSpan = document.getElementById(
    "resultadoParcelaPura"
  );
  const resultadoTaxaAdmMensalSpan = document.getElementById(
    "resultadoTaxaAdmMensal"
  );
  const resultadoValorTaxaAdmMensalSpan = document.getElementById(
    "resultadoValorTaxaAdmMensal"
  );
  const resultadoFundoReservaMensalSpan = document.getElementById(
    "resultadoFundoReservaMensal"
  );
  const resultadoValorFundoReservaMensalSpan = document.getElementById(
    "resultadoValorFundoReservaMensal"
  );
  const resultadoInfoAdesaoSpan = document.getElementById(
    "resultadoInfoAdesao"
  );
  const resultadoSeguroVidaMensalSpan = document.getElementById(
    "resultadoSeguroVidaMensal"
  );
  const labelParcelaBaseSemRedutorStrong = document.getElementById(
    "labelParcelaBaseSemRedutor"
  );
  const resultadoParcelaBaseSemRedutorSpan = document.getElementById(
    "resultadoParcelaBaseSemRedutor"
  );
  const infoRedutorAplicadoDiv = document.getElementById("infoRedutorAplicado");
  const resultadoPercentualRedutorSpan = document.getElementById(
    "resultadoPercentualRedutor"
  );
  const labelParcelaComRedutorStrong = document.getElementById(
    "labelParcelaComRedutor"
  );
  const resultadoParcelaComRedutorSpan = document.getElementById(
    "resultadoParcelaComRedutor"
  );
  const resultadosComLanceDiv = document.getElementById("resultadosComLance");
  const resultadoTipoLanceOfertadoSpan = document.getElementById(
    "resultadoTipoLanceOfertado"
  );
  const resultadoValorLanceOfertadoSpan = document.getElementById(
    "resultadoValorLanceOfertado"
  );
  const resultadoValorEmbutidoUtilizadoSpan = document.getElementById(
    "resultadoValorEmbutidoUtilizado"
  );
  const resultadoValorLanceDoBolsoSpan = document.getElementById(
    "resultadoValorLanceDoBolso"
  );
  const resultadoCreditoLiquidoSpan = document.getElementById(
    "resultadoCreditoLiquido"
  );
  const resultadoPrazoComLanceSpan = document.getElementById(
    "resultadoPrazoComLance"
  );
  const resultadoParcelaPosContemplacaoSpan = document.getElementById(
    "resultadoParcelaPosContemplacao"
  );
  const resultadoSaldoDevedorBaseOriginalSpan = document.getElementById(
    "resultadoSaldoDevedorBaseOriginal"
  );
  const resultadoSaldoDevedorAtualizadoPreLanceSpan = document.getElementById(
    "resultadoSaldoDevedorAtualizadoPreLance"
  );
  const resultadoSeguroVidaMensalAtualizadoPreLanceSpan =
    document.getElementById("resultadoSeguroVidaMensalAtualizadoPreLance");
  const resultadoNumParcelasPagasAbatimentoSpan = document.getElementById(
    "resultadoNumParcelasPagasAbatimento"
  );
  const btnImprimirPDF = document.getElementById("btnImprimirPDF");

  const setElementVisibility = (element, visible) => {
    if (element) {
      element.style.display = visible ? "block" : "none";
    }
  };
  const setRadioOptionAndContainerVisibility = (
    radioInput,
    containerDiv,
    visible
  ) => {
    if (containerDiv) {
      setElementVisibility(containerDiv, visible);
    } else if (radioInput) {
      const label = document.querySelector(`label[for="${radioInput.id}"]`);
      setElementVisibility(radioInput, visible);
      setElementVisibility(label, visible);
      let br = label
        ? label.nextElementSibling
        : radioInput
        ? radioInput.nextElementSibling
        : null;
      if (br && br.tagName === "BR") setElementVisibility(br, visible);
    }
  };

  document
    .querySelectorAll('input[data-type="currency"], input[data-type="percent"]')
    .forEach((input) => {
      if (input) {
        const type = input.dataset.type;
        if (type === "currency")
          input.addEventListener("input", handleCurrencyInput);
        else if (type === "percent")
          input.addEventListener("input", handlePercentInputEvent);
        input.addEventListener("blur", handleFinalFormattingOnBlur);
      }
    });

  document
    .querySelectorAll(
      'input[type="number"][id$="NumeroParcelas"], #mesesPagosAntesDoLance'
    )
    .forEach((input) => {
      if (input) {
        input.addEventListener("input", (e) => {
          let value = e.target.value.replace(/\D/g, "");
          const maxLength = 3;
          if (value.length > maxLength) value = value.slice(0, maxLength);
          e.target.value = value;
        });
        input.addEventListener("blur", (e) => {
          let value = parseInt(e.target.value, 10);
          const minVal = e.target.id === "mesesPagosAntesDoLance" ? 0 : 1;
          let maxVal = e.target.id === "mesesPagosAntesDoLance" ? 239 : 999;

          const adminEl = document.querySelector(
            'input[name="administradora"]:checked'
          );
          const tipoBemEl = document.querySelector(
            'input[name="tipoBem"]:checked'
          );

          if (e.target.id.endsWith("NumeroParcelas")) {
            maxVal = 999;
          } else if (
            e.target.id === "mesesPagosAntesDoLance" &&
            adminEl &&
            tipoBemEl
          ) {
            const admin = adminEl.value;
            const tipoBem = tipoBemEl.value;
            const currentPrefix = `${admin}${
              tipoBem.charAt(0).toUpperCase() + tipoBem.slice(1)
            }`;
            const prazoConsorcioEl = document.getElementById(
              `${currentPrefix}NumeroParcelas`
            );
            if (prazoConsorcioEl && prazoConsorcioEl.value) {
              const prazoTotalNum = parseInt(prazoConsorcioEl.value, 10);
              if (!isNaN(prazoTotalNum) && prazoTotalNum > 0) {
                maxVal = prazoTotalNum;
              }
            }
          }
          if (isNaN(value) || value < minVal) e.target.value = String(minVal);
          else if (value > maxVal) e.target.value = String(maxVal);
        });
      }
    });

  function configurarInterfaceLance(
    admin,
    tipoBem,
    preservarSelecaoLance = false
  ) {
    if (!dadosLanceDiv) return;

    if (containerPortoPercentualEmbutido)
      containerPortoPercentualEmbutido.style.display = "none";
    if (containerYamahaAutomovelOpcoesFixo)
      containerYamahaAutomovelOpcoesFixo.style.display = "none";

    if (tituloDadosLanceH2) {
      tituloDadosLanceH2.textContent = `Simulação com Lance (Opcional)`;
    }
    if (labelTipoLance) {
      labelTipoLance.textContent = `Tipo de Lance (${
        admin.charAt(0).toUpperCase() + admin.slice(1)
      }):`;
    }

    setRadioOptionAndContainerVisibility(
      null,
      opcaoLanceLivreGeralPortoDiv,
      false
    );
    setRadioOptionAndContainerVisibility(
      null,
      opcaoLanceFixoImovelPortoDiv,
      false
    );
    setRadioOptionAndContainerVisibility(
      null,
      opcaoLanceFixoAutomovelPortoDiv,
      false
    );
    setRadioOptionAndContainerVisibility(null, opcaoLanceLivreYamahaDiv, false);
    setRadioOptionAndContainerVisibility(
      null,
      opcaoLanceFixoImovelYamahaDiv,
      false
    );
    setRadioOptionAndContainerVisibility(
      null,
      opcaoLanceFixoAutomovelYamahaDiv,
      false
    );
    setRadioOptionAndContainerVisibility(null, opcaoLanceItauDiv, false);

    if (!preservarSelecaoLance && tipoLanceNenhumRadio) {
      tipoLanceNenhumRadio.checked = true;
    }

    let valorCredito = 0;
    const valorCreditoElId = `${admin}${
      tipoBem.charAt(0).toUpperCase() + tipoBem.slice(1)
    }ValorCredito`;
    const valorCreditoInput = document.getElementById(valorCreditoElId);
    if (valorCreditoInput) {
      valorCredito = getNumericValue(valorCreditoInput.value, "currency") || 0;
    }

    dadosLanceDiv.style.display = "block";

    if (admin === "porto") {
      setRadioOptionAndContainerVisibility(
        null,
        opcaoLanceLivreGeralPortoDiv,
        true
      );
      if (containerPortoPercentualEmbutido) {
        containerPortoPercentualEmbutido.style.display =
          tipoBem === "automovel" ? "block" : "none";
      }
      if (tipoBem === "imovel") {
        setRadioOptionAndContainerVisibility(
          null,
          opcaoLanceFixoImovelPortoDiv,
          true
        );
      } else if (tipoBem === "automovel") {
        const mostrarFixoPortoAuto = valorCredito >= 180000;
        setRadioOptionAndContainerVisibility(
          null,
          opcaoLanceFixoAutomovelPortoDiv,
          mostrarFixoPortoAuto
        );
      }
      atualizarAvisosMaxEmbutido(admin, tipoBem, valorCredito);
    } else if (admin === "yamaha") {
      setRadioOptionAndContainerVisibility(
        null,
        opcaoLanceLivreYamahaDiv,
        true
      );
      if (tipoBem === "imovel") {
        setRadioOptionAndContainerVisibility(
          null,
          opcaoLanceFixoImovelYamahaDiv,
          true
        );
      } else if (tipoBem === "automovel") {
        setRadioOptionAndContainerVisibility(
          null,
          opcaoLanceFixoAutomovelYamahaDiv,
          true
        );
      }
      atualizarAvisosMaxEmbutido(admin, tipoBem, valorCredito);
    } else if (admin === "itau") {
      setRadioOptionAndContainerVisibility(null, opcaoLanceItauDiv, true);
    }

    atualizarVisibilidadeCamposLanceDetalhes();
  }

  function ocultarTodasSecoesPrincipais() {
    setElementVisibility(selecaoTipoBemDiv, false);
    setElementVisibility(dadosClienteTipoDiv, false);
    allAdminBemFieldsDivs.forEach((div) => setElementVisibility(div, false));
    setElementVisibility(dadosLanceDiv, false);
    setElementVisibility(camposLanceLivreDiv, false);
    setElementVisibility(camposLanceFixoPortoDiv, false);
    setElementVisibility(camposLanceLivreYamahaDiv, false);
    setElementVisibility(camposLanceFixoImovelYamahaDiv, false);
    setElementVisibility(camposLanceFixoVagaExclusivaYamahaAutomovelDiv, false);
    setElementVisibility(formaAbatimentoLanceContainerDiv, false);
    setElementVisibility(areaResultadosSimulacaoDiv, false);
    setElementVisibility(erroSimulacaoP, false);
    setElementVisibility(portoAutomovelAlertaLanceDiv, false);
  }

  function atualizarVisibilidadeCamposAdmin() {
    ocultarTodasSecoesPrincipais();
    const adminSelecionadaEl = document.querySelector(
      'input[name="administradora"]:checked'
    );
    if (adminSelecionadaEl) {
      setElementVisibility(selecaoTipoBemDiv, true);
      tipoBemRadios.forEach((radio) => (radio.checked = false));
    } else {
      setElementVisibility(selecaoTipoBemDiv, false);
    }
  }

  function atualizarVisibilidadeCamposBem() {
    const adminSelecionadaEl = document.querySelector(
      'input[name="administradora"]:checked'
    );
    const tipoBemSelecionadoEl = document.querySelector(
      'input[name="tipoBem"]:checked'
    );

    allAdminBemFieldsDivs.forEach((div) => setElementVisibility(div, false));
    setElementVisibility(dadosClienteTipoDiv, false);
    setElementVisibility(dadosLanceDiv, false);
    setElementVisibility(portoAutomovelAlertaLanceDiv, false);
    setElementVisibility(areaResultadosSimulacaoDiv, false);
    setElementVisibility(erroSimulacaoP, false);

    if (adminSelecionadaEl && tipoBemSelecionadoEl) {
      const admin = adminSelecionadaEl.value;
      const tipoBem = tipoBemSelecionadoEl.value;
      const idDivToShow = `fields${
        admin.charAt(0).toUpperCase() + admin.slice(1)
      }${tipoBem.charAt(0).toUpperCase() + tipoBem.slice(1)}`;
      const divParaMostrar = document.getElementById(idDivToShow);

      if (divParaMostrar) {
        setElementVisibility(divParaMostrar, true);
        setElementVisibility(dadosClienteTipoDiv, true);

        if (admin === "porto" || admin === "yamaha" || admin === "itau") {
          setElementVisibility(dadosLanceDiv, true);
          configurarInterfaceLance(admin, tipoBem, false);
        } else {
          setElementVisibility(dadosLanceDiv, false);
        }
      }
      if (nomeAdminResultadoSpan)
        nomeAdminResultadoSpan.textContent = admin.toUpperCase();
      if (tipoBemResultadoSpan)
        tipoBemResultadoSpan.textContent = tipoBem.toUpperCase();
    }
  }

  function calcularValoresBaseParaLanceJS() {
    const adminEl = document.querySelector(
      'input[name="administradora"]:checked'
    );
    const tipoBemEl = document.querySelector('input[name="tipoBem"]:checked');
    if (!adminEl || !tipoBemEl)
      return {
        saldoDevedorBaseOriginalJS: 0,
        saldoDevedorVigenteJS: 0,
        parcelaComRedutorJS: 0,
        valorSeguroVidaMensalOriginalJS: 0,
        seguroVidaMensalVigenteJS: 0,
        prazoRestanteVigenteJS: 0,
        parcelaOriginalJS: 0,
        numParcelasPagasParaAbatimentoJS: 0,
      };

    const admin = adminEl.value;
    const tipoBem = tipoBemEl.value;
    const currentPrefix = `${admin}${
      tipoBem.charAt(0).toUpperCase() + tipoBem.slice(1)
    }`;

    const valorCreditoEl = document.getElementById(
      `${currentPrefix}ValorCredito`
    );
    const prazoEl = document.getElementById(`${currentPrefix}NumeroParcelas`);
    const taxaAdmEl = document.getElementById(`${currentPrefix}TaxaAdm`);
    const fundoReservaEl = document.getElementById(
      `${currentPrefix}FundoReserva`
    );
    const seguroVidaEl = document.getElementById(`${currentPrefix}SeguroVida`);
    const redutorEl = document.getElementById(`${currentPrefix}RedutorParcela`);
    const mesesPagosAntesEl = document.getElementById("mesesPagosAntesDoLance");
    const tipoClienteEl = document.querySelector(
      'input[name="tipoCliente"]:checked'
    );

    const valorCreditoOriginal =
      getNumericValue(valorCreditoEl?.value, "currency") || 0;
    const prazoTotalConsorcio = parseInt(prazoEl?.value, 10) || 0;
    const taxaAdmTotalPercent =
      getNumericValue(taxaAdmEl?.value, "percent") || 0;
    const fundoReservaTotalPercent =
      getNumericValue(fundoReservaEl?.value, "percent") || 0;
    const seguroVidaMensalInformadoPercent =
      getNumericValue(seguroVidaEl?.value, "percent") || 0;
    const percentualRedutorAplicado =
      getNumericValue(redutorEl?.value, "percent") || 0;
    const mesesPagosAntesLanceEstimativa =
      parseInt(mesesPagosAntesEl?.value, 10) || 0;
    const tipoCliente = tipoClienteEl ? tipoClienteEl.value : "cpf";

    if (valorCreditoOriginal <= 0 || prazoTotalConsorcio <= 0) {
      return {
        saldoDevedorBaseOriginalJS: 0,
        saldoDevedorVigenteJS: 0,
        parcelaComRedutorJS: 0,
        valorSeguroVidaMensalOriginalJS: 0,
        seguroVidaMensalVigenteJS: 0,
        prazoRestanteVigenteJS: prazoTotalConsorcio,
        parcelaOriginalJS: 0,
        numParcelasPagasParaAbatimentoJS: 0,
      };
    }

    const percTaxaAdmTotalDecimal = taxaAdmTotalPercent / 100.0;
    const valorTotalTaxaAdm = valorCreditoOriginal * percTaxaAdmTotalDecimal;
    const valorTaxaAdmMensal = valorTotalTaxaAdm / prazoTotalConsorcio;

    const percFundoReservaTotalDecimal = fundoReservaTotalPercent / 100.0;
    const valorTotalFundoReserva =
      valorCreditoOriginal * percFundoReservaTotalDecimal;
    const valorFundoReservaMensal =
      valorTotalFundoReserva / prazoTotalConsorcio;

    const parcelaPura = valorCreditoOriginal / prazoTotalConsorcio;
    const saldoDevedorBaseOriginalJS =
      valorCreditoOriginal + valorTotalTaxaAdm + valorTotalFundoReserva;

    let valorSeguroVidaMensalOriginalJS = 0;
    const percSeguroMensalInformadoDecimal =
      seguroVidaMensalInformadoPercent / 100.0;
    if (tipoCliente === "cpf" && percSeguroMensalInformadoDecimal > 0) {
      let baseCalculoSeguroInicial = valorCreditoOriginal;
      if (admin === "porto" || admin === "yamaha") {
        baseCalculoSeguroInicial = saldoDevedorBaseOriginalJS;
      }
      valorSeguroVidaMensalOriginalJS =
        baseCalculoSeguroInicial * percSeguroMensalInformadoDecimal;
    }

    const parcelaBaseAntesRedutorESeguro =
      parcelaPura + valorTaxaAdmMensal + valorFundoReservaMensal;
    const parcelaOriginalJS =
      parcelaBaseAntesRedutorESeguro + valorSeguroVidaMensalOriginalJS;

    let parcelaComRedutorJS = parcelaOriginalJS;
    if (percentualRedutorAplicado > 0) {
      const componenteBaseComRedutor =
        parcelaBaseAntesRedutorESeguro *
        (1.0 - percentualRedutorAplicado / 100.0);
      parcelaComRedutorJS =
        componenteBaseComRedutor + valorSeguroVidaMensalOriginalJS;
    }
    if (parcelaComRedutorJS < 0) parcelaComRedutorJS = 0;

    let numParcelasPagasParaAbatimentoJS = 0;
    if (
      mesesPagosAntesLanceEstimativa > 0 &&
      mesesPagosAntesLanceEstimativa < prazoTotalConsorcio
    ) {
      numParcelasPagasParaAbatimentoJS = mesesPagosAntesLanceEstimativa;
    }

    let saldoDevedorVigenteJS = saldoDevedorBaseOriginalJS;
    let prazoRestanteVigenteJS = prazoTotalConsorcio;
    let seguroVidaMensalVigenteJS = valorSeguroVidaMensalOriginalJS;

    if (numParcelasPagasParaAbatimentoJS > 0) {
      const totalJaPagoAbatidoDoSDB =
        parcelaComRedutorJS * numParcelasPagasParaAbatimentoJS;
      saldoDevedorVigenteJS =
        saldoDevedorBaseOriginalJS - totalJaPagoAbatidoDoSDB;
      prazoRestanteVigenteJS =
        prazoTotalConsorcio - numParcelasPagasParaAbatimentoJS;

      if (tipoCliente === "cpf" && percSeguroMensalInformadoDecimal > 0) {
        let baseCalculoSeguroAtualizado = valorCreditoOriginal;
        if (admin === "porto" || admin === "yamaha") {
          baseCalculoSeguroAtualizado = saldoDevedorVigenteJS;
        }
        seguroVidaMensalVigenteJS =
          baseCalculoSeguroAtualizado * percSeguroMensalInformadoDecimal;
      } else {
        seguroVidaMensalVigenteJS = 0.0;
      }
    }

    prazoRestanteVigenteJS = Math.max(1, prazoRestanteVigenteJS);
    saldoDevedorVigenteJS = Math.max(0, saldoDevedorVigenteJS);

    return {
      saldoDevedorBaseOriginalJS,
      saldoDevedorVigenteJS,
      parcelaComRedutorJS,
      valorSeguroVidaMensalOriginalJS,
      seguroVidaMensalVigenteJS,
      prazoRestanteVigenteJS,
      parcelaOriginalJS,
      numParcelasPagasParaAbatimentoJS,
    };
  }

  function atualizarCalculoLanceFixoPortoDisplay() {
    const { saldoDevedorVigenteJS } = calcularValoresBaseParaLanceJS();
    const valorLanceFixoCalculado =
      saldoDevedorVigenteJS * PORTO_LANCE_FIXO_PERCENTUAL;

    if (valorCalculadoLanceFixoPortoSpan) {
      valorCalculadoLanceFixoPortoSpan.textContent = formatarMoeda(
        valorLanceFixoCalculado
      );
    }
    if (valorEscondidoLanceFixoPortoInput) {
      valorEscondidoLanceFixoPortoInput.value =
        valorLanceFixoCalculado.toFixed(2);
    }
  }

  function atualizarCalculoLanceFixoYamahaImovelDisplay() {
    const { saldoDevedorVigenteJS } = calcularValoresBaseParaLanceJS();
    const valorLanceFixoCalculado =
      saldoDevedorVigenteJS * YAMAHA_LANCE_FIXO_IMOVEL_SALDO_DEVEDOR_PERCENTUAL;

    if (valorCalculadoLanceFixoImovelYamahaSpan) {
      valorCalculadoLanceFixoImovelYamahaSpan.textContent = formatarMoeda(
        valorLanceFixoCalculado
      );
    }
    if (valorEscondidoLanceFixoImovelYamahaInput) {
      valorEscondidoLanceFixoImovelYamahaInput.value =
        valorLanceFixoCalculado.toFixed(2);
    }
  }

  function atualizarCalculoLanceFixoYamahaAutomovelDisplay() {
    const { saldoDevedorVigenteJS } = calcularValoresBaseParaLanceJS();
    const valorLanceFixoCalculado =
      saldoDevedorVigenteJS *
      YAMAHA_LANCE_FIXO_AUTO_VAGA_EXCLUSIVA_SALDO_DEVEDOR_PERCENTUAL;

    if (valorCalculadoLanceFixoVagaExclusivaYamahaAutomovelSpan) {
      valorCalculadoLanceFixoVagaExclusivaYamahaAutomovelSpan.textContent =
        formatarMoeda(valorLanceFixoCalculado);
    }
    if (valorEscondidoLanceFixoVagaExclusivaYamahaAutomovelInput) {
      valorEscondidoLanceFixoVagaExclusivaYamahaAutomovelInput.value =
        valorLanceFixoCalculado.toFixed(2);
    }
  }

  function atualizarVisibilidadeCamposLanceDetalhes() {
    const tipoLanceSelecionadoEl = document.querySelector(
      'input[name="tipoLance"]:checked'
    );
    if (!tipoLanceSelecionadoEl) {
      setElementVisibility(formaAbatimentoLanceContainerDiv, false);
      return;
    }
    const tipoLance = tipoLanceSelecionadoEl.value;

    const adminEl = document.querySelector(
      'input[name="administradora"]:checked'
    );
    const admin = adminEl ? adminEl.value : null;

    setElementVisibility(camposLanceLivreDiv, false);
    setElementVisibility(camposLanceFixoPortoDiv, false);
    setElementVisibility(camposLanceLivreYamahaDiv, false);
    setElementVisibility(camposLanceFixoImovelYamahaDiv, false);
    setElementVisibility(camposLanceFixoVagaExclusivaYamahaAutomovelDiv, false);
    setElementVisibility(containerYamahaAutomovelOpcoesFixoDiv, false);
    setElementVisibility(camposLanceItauDiv, false);
    setElementVisibility(formaAbatimentoLanceContainerDiv, false);
    setElementVisibility(portoAutomovelAlertaLanceDiv, false);

    if (tipoLance === "nenhum") {
      return;
    }

    setElementVisibility(formaAbatimentoLanceContainerDiv, true);

    if (admin === "porto") {
      if (tipoLance === "livre") {
        setElementVisibility(camposLanceLivreDiv, true);
      } else if (
        tipoLance === "fixo_porto_imovel" ||
        tipoLance === "fixo_porto_automovel"
      ) {
        setElementVisibility(camposLanceFixoPortoDiv, true);
        atualizarCalculoLanceFixoPortoDisplay();
      }
    } else if (admin === "yamaha") {
      if (tipoLance === "livre_yamaha") {
        setElementVisibility(camposLanceLivreYamahaDiv, true);
      } else if (tipoLance === "fixo_yamaha_imovel") {
        setElementVisibility(camposLanceFixoImovelYamahaDiv, true);
        atualizarCalculoLanceFixoYamahaImovelDisplay();
      } else if (tipoLance === "fixo_yamaha_automovel") {
        setElementVisibility(containerYamahaAutomovelOpcoesFixoDiv, true);
        setElementVisibility(
          camposLanceFixoVagaExclusivaYamahaAutomovelDiv,
          true
        );
        atualizarCalculoLanceFixoYamahaAutomovelDisplay();
      }
    } else if (admin === "itau") {
      if (tipoLance === "lance_itau") {
        setElementVisibility(camposLanceItauDiv, true);
      }
    }

    toggleDetalhesEmbutido();
  }

  const valorCreditoInputs = [
    portoImovelValorCreditoInput,
    portoAutomovelValorCreditoInput,
    yamahaImovelValorCreditoInput,
    yamahaAutomovelValorCreditoInput,
  ];

  valorCreditoInputs.forEach((input) => {
    if (input) {
      const inputId = input.id.toLowerCase();
      let adminDoInput = null;
      let tipoBemDoInput = null;

      if (inputId.includes("porto")) adminDoInput = "porto";
      else if (inputId.includes("yamaha")) adminDoInput = "yamaha";

      if (inputId.includes("imovel")) tipoBemDoInput = "imovel";
      else if (inputId.includes("automovel")) tipoBemDoInput = "automovel";

      if (adminDoInput && tipoBemDoInput) {
        const eventHandler = (preservar) => {
          const adminSelecionadaEl = document.querySelector(
            'input[name="administradora"]:checked'
          );
          if (adminSelecionadaEl && adminSelecionadaEl.value === adminDoInput) {
            configurarInterfaceLance(adminDoInput, tipoBemDoInput, preservar);
          }
        };
        input.addEventListener("blur", () => eventHandler(false));
      }
    }
  });

  if (mesesPagosAntesDoLanceInput) {
    mesesPagosAntesDoLanceInput.addEventListener("input", () => {
      const adminEl = document.querySelector(
        'input[name="administradora"]:checked'
      );
      const tipoBemEl = document.querySelector('input[name="tipoBem"]:checked');
      if (adminEl && tipoBemEl) {
        configurarInterfaceLance(adminEl.value, tipoBemEl.value, true);
      }
    });
  }

  function atualizarAvisosMaxEmbutido(admin, tipoBem, valorCredito) {
    let maxEmbutidoPercent = 0;
    let spanMaxEmbutidoLivre = null;
    let inputValorEmbutidoLivre = null;
    let avisoMaxEmbutidoLivre = null;
    let labelEmbutidoLivre = null;

    let spanMaxEmbutidoFixo = null;
    let inputValorEmbutidoFixo = null;
    let avisoMaxEmbutidoFixo = null;
    let labelEmbutidoFixo = null;
    let maxEmbutidoFixoPercent = 0;

    if (admin === "porto") {
      spanMaxEmbutidoLivre = maximoEmbutidoLivreValorSpan;
      inputValorEmbutidoLivre = valorEmbutidoLanceLivreUsarInput;
      avisoMaxEmbutidoLivre = avisoMaxEmbutidoLanceLivreSmall;
      labelEmbutidoLivre = labelUsarEmbutidoLanceLivre;

      spanMaxEmbutidoFixo = maximoEmbutidoFixoPortoValorSpan;
      inputValorEmbutidoFixo = valorEmbutidoLanceFixoPortoUsarInput;
      avisoMaxEmbutidoFixo = avisoMaxEmbutidoLanceFixoPortoSmall;
      labelEmbutidoFixo = labelUsarEmbutidoLanceFixoPorto;

      if (tipoBem === "imovel") {
        maxEmbutidoPercent = PORTO_EMBUTIDO_IMOVEL_PERCENTUAL;
        maxEmbutidoFixoPercent = PORTO_EMBUTIDO_IMOVEL_PERCENTUAL;
      } else if (tipoBem === "automovel") {
        const percentualSelecionado =
          parseFloat(portoAutomovelPercentualEmbutido.value) || 0;
        maxEmbutidoPercent = percentualSelecionado;

        if (valorCredito >= PORTO_AUTO_VALOR_CORTE_EMBUTIDO) {
          maxEmbutidoFixoPercent = percentualSelecionado;
        } else {
          maxEmbutidoFixoPercent = 0;
        }
      }
    } else if (admin === "yamaha") {
      if (tipoBem === "imovel") {
        spanMaxEmbutidoLivre = maximoEmbutidoLivreYamahaValorSpan;
        inputValorEmbutidoLivre = valorEmbutidoLanceLivreYamahaUsarInput;
        avisoMaxEmbutidoLivre = avisoMaxEmbutidoLanceLivreYamahaSmall;
        labelEmbutidoLivre = labelUsarEmbutidoLanceLivreYamaha;
        maxEmbutidoPercent = YAMAHA_EMBUTIDO_LIVRE_IMOVEL_CREDITO_PERCENTUAL;

        spanMaxEmbutidoFixo = maximoEmbutidoFixoImovelYamahaValorSpan;
        inputValorEmbutidoFixo = valorEmbutidoFixoImovelYamahaUsarInput;
        avisoMaxEmbutidoFixo = avisoMaxEmbutidoFixoImovelYamahaSmall;
        labelEmbutidoFixo = labelUsarEmbutidoFixoImovelYamaha;
        maxEmbutidoFixoPercent =
          YAMAHA_LANCE_FIXO_IMOVEL_EMBUTIDO_AUXILIAR_CREDITO_PERCENTUAL;
      } else if (tipoBem === "automovel") {
        spanMaxEmbutidoLivre = maximoEmbutidoLivreYamahaValorSpan;
        inputValorEmbutidoLivre = valorEmbutidoLanceLivreYamahaUsarInput;
        avisoMaxEmbutidoLivre = avisoMaxEmbutidoLanceLivreYamahaSmall;
        labelEmbutidoLivre = labelUsarEmbutidoLanceLivreYamaha;
        maxEmbutidoPercent = YAMAHA_EMBUTIDO_LIVRE_AUTO_CREDITO_PERCENTUAL;

        spanMaxEmbutidoFixo =
          maximoEmbutidoFixoVagaExclusivaYamahaAutomovelValorSpan;
        inputValorEmbutidoFixo =
          valorEmbutidoFixoVagaExclusivaYamahaAutomovelUsarInput;
        avisoMaxEmbutidoFixo =
          avisoMaxEmbutidoFixoVagaExclusivaYamahaAutomovelSmall;
        labelEmbutidoFixo = labelUsarEmbutidoFixoVagaExclusivaYamahaAutomovel;
        maxEmbutidoFixoPercent =
          YAMAHA_LANCE_FIXO_AUTO_VAGA_EXCLUSIVA_EMBUTIDO_AUXILIAR_CREDITO_PERCENTUAL;
      }
    }

    const valorMaxEmbutidoAbsoluto = valorCredito * maxEmbutidoPercent;
    if (spanMaxEmbutidoLivre)
      spanMaxEmbutidoLivre.textContent = formatarMoeda(
        valorMaxEmbutidoAbsoluto
      );
    if (inputValorEmbutidoLivre)
      inputValorEmbutidoLivre.dataset.maxEmbutido =
        valorMaxEmbutidoAbsoluto.toFixed(2);
    if (avisoMaxEmbutidoLivre)
      avisoMaxEmbutidoLivre.textContent = `Máx. ${formatarMoeda(
        valorMaxEmbutidoAbsoluto
      )} (${(maxEmbutidoPercent * 100).toFixed(0)}% do crédito)`;
    if (labelEmbutidoLivre)
      labelEmbutidoLivre.textContent = `Utilizar Lance Embutido (${
        admin.charAt(0).toUpperCase() + admin.slice(1)
      } - até ${(maxEmbutidoPercent * 100).toFixed(0)}% do crédito)`;

    const valorMaxEmbutidoFixoAbsoluto = valorCredito * maxEmbutidoFixoPercent;
    if (spanMaxEmbutidoFixo) {
      spanMaxEmbutidoFixo.textContent = formatarMoeda(
        valorMaxEmbutidoFixoAbsoluto
      );
    }
    if (inputValorEmbutidoFixo) {
      inputValorEmbutidoFixo.dataset.maxEmbutido =
        valorMaxEmbutidoFixoAbsoluto.toFixed(2);
    }
    if (avisoMaxEmbutidoFixo) {
      avisoMaxEmbutidoFixo.textContent = `Máx. ${formatarMoeda(
        valorMaxEmbutidoFixoAbsoluto
      )} (${(maxEmbutidoFixoPercent * 100).toFixed(0)}% do crédito)`;
    }
    if (labelEmbutidoFixo) {
      let textoLabelFixo = `Utilizar Lance Embutido`;
      if (admin === "yamaha" && tipoBem === "imovel")
        textoLabelFixo = `Utilizar Lance Embutido Auxiliar (Yamaha Imóvel - até ${(
          maxEmbutidoFixoPercent * 100
        ).toFixed(0)}% do crédito)`;
      else if (admin === "yamaha" && tipoBem === "automovel")
        textoLabelFixo = `Utilizar Lance Embutido Auxiliar (Yamaha Automóvel - até ${(
          maxEmbutidoFixoPercent * 100
        ).toFixed(0)}% do crédito)`;
      else if (admin === "porto")
        textoLabelFixo = `Utilizar Lance Embutido (Porto - até ${(
          maxEmbutidoFixoPercent * 100
        ).toFixed(0)}% do crédito)`;
      labelEmbutidoFixo.textContent = textoLabelFixo;
    }
  }

  function toggleDetalhesEmbutido() {
    if (
      usarEmbutidoLanceFixoPortoCheckbox &&
      detalhesEmbutidoLanceFixoPortoDiv
    ) {
      detalhesEmbutidoLanceFixoPortoDiv.style.display =
        usarEmbutidoLanceFixoPortoCheckbox.checked ? "block" : "none";
      if (
        !usarEmbutidoLanceFixoPortoCheckbox.checked &&
        valorEmbutidoLanceFixoPortoUsarInput
      )
        valorEmbutidoLanceFixoPortoUsarInput.value = "";
    }
    if (usarEmbutidoLanceLivreCheckbox && detalhesEmbutidoLanceLivreDiv) {
      detalhesEmbutidoLanceLivreDiv.style.display =
        usarEmbutidoLanceLivreCheckbox.checked ? "block" : "none";
      if (
        !usarEmbutidoLanceLivreCheckbox.checked &&
        valorEmbutidoLanceLivreUsarInput
      )
        valorEmbutidoLanceLivreUsarInput.value = "";
    }
    if (
      usarEmbutidoLanceLivreYamahaCheckbox &&
      detalhesEmbutidoLanceLivreYamahaDiv
    ) {
      detalhesEmbutidoLanceLivreYamahaDiv.style.display =
        usarEmbutidoLanceLivreYamahaCheckbox.checked ? "block" : "none";
      if (
        !usarEmbutidoLanceLivreYamahaCheckbox.checked &&
        valorEmbutidoLanceLivreYamahaUsarInput
      )
        valorEmbutidoLanceLivreYamahaUsarInput.value = "";
    }
    if (
      usarEmbutidoFixoImovelYamahaCheckbox &&
      detalhesEmbutidoFixoImovelYamahaDiv
    ) {
      detalhesEmbutidoFixoImovelYamahaDiv.style.display =
        usarEmbutidoFixoImovelYamahaCheckbox.checked ? "block" : "none";
      if (
        !usarEmbutidoFixoImovelYamahaCheckbox.checked &&
        valorEmbutidoFixoImovelYamahaUsarInput
      )
        valorEmbutidoFixoImovelYamahaUsarInput.value = "";
    }
    if (
      usarEmbutidoFixoVagaExclusivaYamahaAutomovelCheckbox &&
      detalhesEmbutidoFixoVagaExclusivaYamahaAutomovelDiv
    ) {
      detalhesEmbutidoFixoVagaExclusivaYamahaAutomovelDiv.style.display =
        usarEmbutidoFixoVagaExclusivaYamahaAutomovelCheckbox.checked
          ? "block"
          : "none";
      if (
        !usarEmbutidoFixoVagaExclusivaYamahaAutomovelCheckbox.checked &&
        valorEmbutidoFixoVagaExclusivaYamahaAutomovelUsarInput
      )
        valorEmbutidoFixoVagaExclusivaYamahaAutomovelUsarInput.value = "";
    }
  }

  [
    usarEmbutidoLanceFixoPortoCheckbox,
    usarEmbutidoLanceLivreCheckbox,
    usarEmbutidoLanceLivreYamahaCheckbox,
    usarEmbutidoFixoImovelYamahaCheckbox,
    usarEmbutidoFixoVagaExclusivaYamahaAutomovelCheckbox,
  ].forEach((checkbox) => {
    if (checkbox) checkbox.addEventListener("change", toggleDetalhesEmbutido);
  });

  [
    valorEmbutidoLanceFixoPortoUsarInput,
    valorEmbutidoLanceLivreUsarInput,
    valorEmbutidoLanceLivreYamahaUsarInput,
    valorEmbutidoFixoImovelYamahaUsarInput,
    valorEmbutidoFixoVagaExclusivaYamahaAutomovelUsarInput,
  ].forEach((input) => {
    if (input) {
      input.addEventListener("blur", (event) => {
        const targetInput = event.target;
        const valorDigitado = getNumericValue(targetInput.value, "currency");
        const maxEmbutidoPermitido = parseFloat(
          targetInput.dataset.maxEmbutido
        );

        if (!isNaN(valorDigitado) && !isNaN(maxEmbutidoPermitido)) {
          if (valorDigitado > maxEmbutidoPermitido) {
            targetInput.value = formatarMoeda(maxEmbutidoPermitido);
          }
        } else if (isNaN(valorDigitado)) {
          targetInput.value = formatarMoeda(0);
        }
      });
    }
  });

  function getDadosCreditoFromForm() {
    const adminEl = document.querySelector(
      'input[name="administradora"]:checked'
    );
    const tipoBemEl = document.querySelector('input[name="tipoBem"]:checked');
    const tipoClienteEl = document.querySelector(
      'input[name="tipoCliente"]:checked'
    );

    if (!adminEl || !tipoBemEl || !tipoClienteEl) {
      console.error(
        "[Simulador Parcelas] Erro: Administradora, Tipo de Bem ou Opção de Seguro não selecionado."
      );
      return null;
    }
    const admin = adminEl.value;
    const tipoBem = tipoBemEl.value;
    const tipoCliente = tipoClienteEl.value;
    const prefix = `${admin}${
      tipoBem.charAt(0).toUpperCase() + tipoBem.slice(1)
    }`;

    let seguroVidaPercent = 0;
    if (tipoCliente === "cpf") {
      seguroVidaPercent = getNumericValue(
        document.getElementById(`${prefix}SeguroVida`)?.value,
        "percent"
      );
    }

    const dadosCredito = {
      nomeCliente:
        document.getElementById("nomeCliente")?.value || "Não informado",
      admin: admin,
      tipoBem: tipoBem,
      tipoCliente: tipoCliente,
      valorCredito: getNumericValue(
        document.getElementById(`${prefix}ValorCredito`)?.value,
        "currency"
      ),
      numeroParcelas: parseInt(
        document.getElementById(`${prefix}NumeroParcelas`)?.value,
        10
      ),
      taxaAdm: getNumericValue(
        document.getElementById(`${prefix}TaxaAdm`)?.value,
        "percent"
      ),
      fundoReserva: getNumericValue(
        document.getElementById(`${prefix}FundoReserva`)?.value,
        "percent"
      ),
      seguroVida: seguroVidaPercent,
      redutorParcela: getNumericValue(
        document.getElementById(`${prefix}RedutorParcela`)?.value,
        "percent"
      ),
      adesao:
        admin === "porto" && tipoBem === "imovel"
          ? getNumericValue(
              document.getElementById(`portoImovelAdesao`)?.value,
              "percent"
            )
          : 0,
      formaPagamentoAdesao:
        admin === "porto" && tipoBem === "imovel"
          ? document.querySelector(
              'input[name="portoImovelPagamentoAdesao"]:checked'
            )?.value
          : null,
      mesesPagosAntesLance:
        parseInt(mesesPagosAntesDoLanceInput?.value, 10) || 0,
      portoAutomovelPercentualEmbutido:
        admin === "porto" && tipoBem === "automovel"
          ? parseFloat(portoAutomovelPercentualEmbutido?.value)
          : null,
    };

    if (
      isNaN(dadosCredito.valorCredito) ||
      dadosCredito.valorCredito <= 0 ||
      isNaN(dadosCredito.numeroParcelas) ||
      dadosCredito.numeroParcelas <= 0
    ) {
      console.error(
        "[Simulador Parcelas] Erro: Valor do crédito ou número de parcelas inválido."
      );
      if (erroSimulacaoP) {
        erroSimulacaoP.textContent =
          "Erro: Valor do crédito e Número de Parcelas são obrigatórios e devem ser maiores que zero.";
        setElementVisibility(erroSimulacaoP, true);
      }
      return null;
    }
    return dadosCredito;
  }

  function getDadosLanceFromForm() {
    const adminEl = document.querySelector(
      'input[name="administradora"]:checked'
    );
    const tipoBemEl = document.querySelector('input[name="tipoBem"]:checked');
    const tipoLanceEl = document.querySelector(
      'input[name="tipoLance"]:checked'
    );

    if (
      !adminEl ||
      !tipoBemEl ||
      !tipoLanceEl ||
      tipoLanceEl.value === "nenhum"
    ) {
      return { tipo: "nenhum" };
    }

    const admin = adminEl.value;
    const tipoLance = tipoLanceEl.value;
    const formaAbatimento = formaAbatimentoLanceSelect
      ? formaAbatimentoLanceSelect.value
      : "reduzir_prazo_final";

    let dadosLance = {
      tipo: tipoLance,
      formaAbatimento: formaAbatimento,
      valorLanceLivre: 0,
      percentualLanceLivre: 0,
      usarEmbutido: false,
      valorEmbutido: 0,
      percentualLanceProprioItau: 0,
      percentualLanceEmbutidoItau: 0,
    };

    if (admin === "itau") {
      if (tipoLance === "lance_itau") {
        dadosLance.percentualLanceProprioItau =
          getNumericValue(percentualLanceProprioItauInput?.value, "percent") ||
          0;
        dadosLance.percentualLanceEmbutidoItau =
          getNumericValue(percentualLanceEmbutidoItauInput?.value, "percent") ||
          0;
      }
    } else if (admin === "porto") {
      if (tipoLance === "livre") {
        dadosLance.valorLanceLivre =
          getNumericValue(valorLanceLivreInput?.value, "currency") || 0;
        dadosLance.percentualLanceLivre =
          getNumericValue(percentualLanceLivreInput?.value, "percent") || 0;
        dadosLance.usarEmbutido =
          usarEmbutidoLanceLivreCheckbox?.checked || false;
        if (dadosLance.usarEmbutido) {
          dadosLance.valorEmbutido =
            getNumericValue(
              valorEmbutidoLanceLivreUsarInput?.value,
              "currency"
            ) || 0;
        }
      } else if (
        tipoLance === "fixo_porto_imovel" ||
        tipoLance === "fixo_porto_automovel"
      ) {
        dadosLance.usarEmbutido =
          usarEmbutidoLanceFixoPortoCheckbox?.checked || false;
        if (dadosLance.usarEmbutido) {
          dadosLance.valorEmbutido =
            getNumericValue(
              valorEmbutidoLanceFixoPortoUsarInput?.value,
              "currency"
            ) || 0;
        }
      }
    } else if (admin === "yamaha") {
      if (tipoLance === "livre_yamaha") {
        dadosLance.valorLanceLivre =
          getNumericValue(valorLanceLivreYamahaInput?.value, "currency") || 0;
        dadosLance.percentualLanceLivre =
          getNumericValue(percentualLanceLivreYamahaInput?.value, "percent") ||
          0;
        dadosLance.usarEmbutido =
          usarEmbutidoLanceLivreYamahaCheckbox?.checked || false;
        if (dadosLance.usarEmbutido) {
          dadosLance.valorEmbutido =
            getNumericValue(
              valorEmbutidoLanceLivreYamahaUsarInput?.value,
              "currency"
            ) || 0;
        }
      } else if (tipoLance === "fixo_yamaha_imovel") {
        dadosLance.usarEmbutido =
          usarEmbutidoFixoImovelYamahaCheckbox?.checked || false;
        if (dadosLance.usarEmbutido) {
          dadosLance.valorEmbutido =
            getNumericValue(
              valorEmbutidoFixoImovelYamahaUsarInput?.value,
              "currency"
            ) || 0;
        }
      } else if (tipoLance === "fixo_yamaha_automovel") {
        dadosLance.usarEmbutido =
          usarEmbutidoFixoVagaExclusivaYamahaAutomovelCheckbox?.checked ||
          false;
        if (dadosLance.usarEmbutido) {
          dadosLance.valorEmbutido =
            getNumericValue(
              valorEmbutidoFixoVagaExclusivaYamahaAutomovelUsarInput?.value,
              "currency"
            ) || 0;
        }
        dadosLance.percentualLanceFixoYamahaAuto =
          parseFloat(yamahaAutomovelPercentualFixoSelect?.value) || 0;
      }
    }

    return dadosLance;
  }
  function calcularSimulacaoNoNavegador(payload) {
    const { credito, lance } = payload;

    const valorCredito = credito.valorCredito || 0;
    const prazo = credito.numeroParcelas || 0;
    const taxaAdm = (credito.taxaAdm || 0) / 100;
    const fundoReserva = (credito.fundoReserva || 0) / 100;
    const seguroVida = (credito.seguroVida || 0) / 100;
    const redutorParcela = (credito.redutorParcela || 0) / 100;

    if (prazo === 0) return { erro: "Número de parcelas não pode ser zero." };

    const valorTotalTaxaAdm = valorCredito * taxaAdm;
    const valorTotalFundoReserva = valorCredito * fundoReserva;
    const saldoDevedorBase =
      valorCredito + valorTotalTaxaAdm + valorTotalFundoReserva;

    const parcelaPura = valorCredito / prazo;
    const valorTaxaAdmMensal = valorTotalTaxaAdm / prazo;
    const valorFundoReservaMensal = valorTotalFundoReserva / prazo;

    let baseCalculoSeguro = valorCredito;
    if (credito.admin === "porto" || credito.admin === "yamaha") {
      baseCalculoSeguro = saldoDevedorBase;
    }
    const valorSeguroVidaMensal =
      credito.tipoCliente === "cpf" ? baseCalculoSeguro * seguroVida : 0;

    const parcelaOriginal =
      parcelaPura +
      valorTaxaAdmMensal +
      valorFundoReservaMensal +
      valorSeguroVidaMensal;

    let parcelaComRedutor = parcelaOriginal;
    if (redutorParcela > 0) {
      const baseReduzivel =
        parcelaPura + valorTaxaAdmMensal + valorFundoReservaMensal;
      parcelaComRedutor =
        baseReduzivel * (1 - redutorParcela) + valorSeguroVidaMensal;
    }

    let adesaoMensal = 0;
    if (
      credito.admin === "porto" &&
      credito.tipoBem === "imovel" &&
      credito.adesao > 0
    ) {
      adesaoMensal =
        (valorCredito * (credito.adesao / 100)) /
        parseInt(credito.formaPagamentoAdesao, 10);
    }

    let resultadoLance = { tipo: "nenhum" };
    let creditoLiquido = valorCredito;
    let parcelaPosContemplacao = parcelaComRedutor;
    let prazoComLance = prazo;

    if (lance.tipo !== "nenhum") {
      let valorTotalLance = 0;
      if (lance.tipo.includes("fixo")) {
        valorTotalLance = saldoDevedorBase * 0.4;
      } else {
        valorTotalLance =
          lance.valorLanceLivre ||
          saldoDevedorBase * (lance.percentualLanceLivre / 100);
      }

      const valorEmbutido = lance.usarEmbutido ? lance.valorEmbutido : 0;
      const valorDoBolso = valorTotalLance - valorEmbutido;
      creditoLiquido = valorCredito - valorEmbutido;

      if (lance.formaAbatimento === "reduzir_valor_parcela") {
        const novoSaldoDevedor = saldoDevedorBase - valorTotalLance;
        parcelaPosContemplacao =
          novoSaldoDevedor / prazo + valorSeguroVidaMensal;
      } else {
        const parcelasPagasPeloLance = Math.floor(
          valorTotalLance / parcelaComRedutor
        );
        prazoComLance = prazo - parcelasPagasPeloLance;
      }

      resultadoLance = {
        ...lance,
        valorDoBolso,
        valorEmbutido,
        percentualOfertado: (valorTotalLance / saldoDevedorBase) * 100,
      };
    }

    return {
      erro: null,
      lance: resultadoLance,
      parcelaComRedutor,
      parcelaOriginal,
      creditoLiquido,
      parcelaPosContemplacao,
      prazoComLance,
      adesaoMensal,
      percentualRedutor: credito.redutorParcela,
    };
  }

  function simularConsorcio() {
    if (erroSimulacaoP) erroSimulacaoP.style.display = "none";
    setElementVisibility(areaResultadosSimulacaoDiv, false);

    const dadosCredito = getDadosCreditoFromForm();
    if (!dadosCredito) {
      return;
    }

    const dadosLance = getDadosLanceFromForm();
    const payload = {
      credito: dadosCredito,
      lance: dadosLance,
    };

    btnSimular.disabled = true;
    btnSimular.textContent = "Simulando...";

    try {
      const resultado = realizarCalculoSimulacao(
        payload.credito,
        payload.lance
      );

      if (resultado.erro) {
        erroSimulacaoP.textContent = `Erro na simulação: ${resultado.erro}`;
        setElementVisibility(erroSimulacaoP, true);
      } else {
        exibirResultados(resultado, dadosCredito);
      }
    } catch (error) {
      console.error("[Simulador Parcelas Web] Erro ao simular:", error);
      erroSimulacaoP.textContent = `Erro inesperado durante o cálculo: ${error.message}`;
      setElementVisibility(erroSimulacaoP, true);
    } finally {
      btnSimular.disabled = false;
      btnSimular.textContent = "Calcular Simulação Completa";
    }
  }

  async function gerarPDF() {
    if (!ultimoResultadoParaPdf) {
      alert("Por favor, gere uma simulação primeiro antes de imprimir.");
      return;
    }

    btnImprimirPDF.disabled = true;
    btnImprimirPDF.textContent = "Gerando PDF...";
    if (erroSimulacaoP) erroSimulacaoP.style.display = "none";

    try {
      const [templateResponse, cssResponse] = await Promise.all([
        fetch("./src/pages/html/pdf_template.html"),
        fetch("./src/pages/css/pdf_style.css"),
      ]);

      let htmlTemplate = await templateResponse.text();
      const cssText = await cssResponse.text();

      htmlTemplate = htmlTemplate.replace(
        "</head>",
        `<style>${cssText}</style></head>`
      );

      const { resultado, dadosCredito } = ultimoResultadoParaPdf;
      const comLance = resultado.lance && resultado.lance.tipo !== "nenhum";

      const placeholders = {
        "{{LOGO_IMG_TAG}}":
            '<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAABmQAAAL1CAYAAADZ8ovYAAAACXBIWXMAAC4jAAAuIwF4pT92AAAKXGlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNi4wLWMwMDYgNzkuMTY0NzUzLCAyMDIxLzAyLzE1LTExOjUyOjEzICAgICAgICAiPiA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RFdnQ9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZUV2ZW50IyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtbG5zOmRjPSJodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xLyIgeG1sbnM6cGhvdG9zaG9wPSJodHRwOi8vbnMuYWRvYmUuY29tL3Bob3Rvc2hvcC8xLjAvIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtbG5zOnRpZmY9Imh0dHA6Ly9ucy5hZG9iZS5jb20vdGlmZi8xLjAvIiB4bWxuczpleGlmPSJodHRwOi8vbnMuYWRvYmUuY29tL2V4aWYvMS4wLyIgeG1wTU06RG9jdW1lbnRJRD0iYWRvYmU6ZG9jaWQ6cGhvdG9zaG9wOmE3NmMzNTg0LWQ3ZTctMGM0MC04Zjg5LWE0MjAyZGM1NDQzNCIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDo1M2RlMTUyZC1hOGJjLTZlNDItYTRjOC0yNjNjMTA5YzFjNDciIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0iQjhGMzA0REE2RTZBN0Q3RjM2NTMyOENEMDk4ODlENzUiIGRjOmZvcm1hdD0iaW1hZ2UvcG5nIiBwaG90b3Nob3A6Q29sb3JNb2RlPSIzIiBwaG90b3Nob3A6SUNDUHJvZmlsZT0ic1JHQiBJRUM2MTk2Ni0yLjEiIHhtcDpDcmVhdGVEYXRlPSIyMDI0LTA2LTA2VDE2OjM1OjU0LTAzOjAwIiB4bXA6TW9kaWZ5RGF0ZT0iMjAyNS0wNS0yNlQxNjozNjoyNC0wMzowMCIgeG1wOk1ldGFkYXRhRGF0ZT0iMjAyNS0wNS0yNlQxNjozNjoyNC0wMzowMCIgdGlmZjpJbWFnZVdpZHRoPSIzNjAwIiB0aWZmOkltYWdlTGVuZ3RoPSIyNTQ5IiB0aWZmOlBob3RvbWV0cmljSW50ZXJwcmV0YXRpb249IjIiIHRpZmY6T3JpZW50YXRpb249IjEiIHRpZmY6U2FtcGxlc1BlclBpeGVsPSIzIiB0aWZmOllDYkNyUG9zaXRpb25pbmc9IjEiIHRpZmY6WFJlc29sdXRpb249IjExOC8xIiB0aWZmOllSZXNvbHV0aW9uPSIxMTgvMSIgdGlmZjpSZXNvbHV0aW9uVW5pdD0iMyIgZXhpZjpFeGlmVmVyc2lvbj0iMDIzMSIgZXhpZjpDb2xvclNwYWNlPSI2NTUzNSIgZXhpZjpQaXhlbFhEaW1lbnNpb249IjM2MDAiIGV4aWY6UGl4ZWxZRGltZW5zaW9uPSIyNTQ5Ij4gPHhtcE1NOkhpc3Rvcnk+IDxyZGY6U2VxPiA8cmRmOmxpIHN0RXZ0OmFjdGlvbj0ic2F2ZWQiIHN0RXZ0Omluc3RhbmNlSUQ9InhtcC5paWQ6OTU1MjZiMDgtYzAyYS0xZDRkLWE0NzYtM2Q4NjNiM2JkZWNiIiBzdEV2dDp3aGVuPSIyMDI0LTA2LTA2VDE2OjM3OjQwLTAzOjAwIiBzdEV2dDpzb2Z0d2FyZUFnZW50PSJBZG9iZSBQaG90b3Nob3AgMjUuMSAoV2luZG93cykiIHN0RXZ0OmNoYW5nZWQ9Ii8iLz4gPHJkZjpsaSBzdEV2dDphY3Rpb249ImNvbnZlcnRlZCIgc3RFdnQ6cGFyYW1ldGVycz0iZnJvbSBpbWFnZS9qcGVnIHRvIGltYWdlL3BuZyIvPiA8cmRmOmxpIHN0RXZ0OmFjdGlvbj0iZGVyaXZlZCIgc3RFdnQ6cGFyYW1ldGVycz0iY29udmVydGVkIGZyb20gaW1hZ2UvanBlZyB0byBpbWFnZS9wbmciLz4gPHJkZjpsaSBzdEV2dDphY3Rpb249InNhdmVkIiBzdEV2dDppbnN0YW5jZUlEPSJ4bXAuaWlkOjMyMDJhY2IyLWI4YTQtMDQ0MS05YmE2LWZhN2Y0ZGQ2N2NkOSIgc3RFdnQ6d2hlbj0iMjAyNC0wNi0wNlQxNjozNzo0MC0wMzowMCIgc3RFdnQ6c29mdHdhcmVBZ2VudD0iQWRvYmUgUGhvdG9zaG9wIDI1LjEgKFdpbmRvd3MpIiBzdEV2dDpjaGFuZ2VkPSIvIi8+IDxyZGY6bGkgc3RFdnQ6YWN0aW9uPSJzYXZlZCIgc3RFdnQ6aW5zdGFuY2VJRD0ieG1wLmlpZDo1M2RlMTUyZC1hOGJjLTZlNDItYTRjOC0yNjNjMTA5YzFjNDciIHN0RXZ0OndoZW49IjIwMjUtMDUtMjZUMTY6MzY6MjQtMDM6MDAiIHN0RXZ0OnNvZnR3YXJlQWdlbnQ9IkFkb2JlIFBob3Rvc2hvcCAyMi4zIChXaW5kb3dzKSIgc3RFdnQ6Y2hhbmdlZD0iLyIvPiA8L3JkZjpTZXE+IDwveG1wTU06SGlzdG9yeT4gPHhtcE1NOkRlcml2ZWRGcm9tIHN0UmVmOmluc3RhbmNlSUQ9InhtcC5paWQ6OTU1MjZiMDgtYzAyYS0xZDRkLWE0NzYtM2Q4NjNiM2JkZWNiIiBzdFJlZjpkb2N1bWVudElEPSJCOEYzMDREQTZFNkE3RDdGMzY1MzI4Q0QwOTg4OUQ3NSIgc3RSZWY6b3JpZ2luYWxEb2N1bWVudElEPSJCOEYzMDREQTZFNkE3RDdGMzY1MzI4Q0QwOTg4OUQ3NSIvPiA8dGlmZjpCaXRzUGVyU2FtcGxlPiA8cmRmOlNlcT4gPHJkZjpsaT44PC9yZGY6bGk+IDxyZGY6bGk+ODwvcmRmOmxpPiA8cmRmOmxpPjg8L3JkZjpsaT4gPC9yZGY6U2VxPiA8L3RpZmY6Qml0c1BlclNhbXBsZT4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBh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Pyz+v0j/V/I/qv+f+v9Y/z/g/3f3/3v6vz3/L9L//wz//xr//yr/f4H//yX/X2X/d/X/hf+/8v/j/B/G//f4v+n+3+b/V/a/kf1v4f5H/D/C/y/5/9v9v/X/R//fof+/2/8/xf+/6v+f//+E//+M//8d/68V//80//8G//8C//8S//8S/d+6//+T+r/y/xv8f63+H6z/V/b/of+/wf8v8P/2//8m/x/R/j/w/wv/f8P/X8D//4n9f1T+1/y/+v/H+D+c/2f1/9r9P8b//+L//wL/v0P//2H//yP/X8H//yr//zL+//T//8H//5D//xP9X97/F//fqf/H9v+q/1/T//f6/8P+/8P//8j/l/s/3/+f6P//7H/fwr/74T//wL+P8z/L/t/if+/8v/F/B/E/+f9fwj/v6L/T/j/Uv/P7v/3+L+Y/i/mv7X8L83/N/i/0/7f6f+3+7+t/w/g/2P+n8f+N/B/if+/8P//6X//wj/36b//yj/3/L//4P//63//4L/H+r//6H//1L//wr+P8b/f/L/h/+v4v9P+f8J/j/B/j/i/7P738n+X+L/B/4/wv4P+f+B/z/e/+/2/8/0/538f73/79D/B/i//4f//8z//x3/vyz/v9z/F/r/6v6P8H8R/68S/x+L//dF//8o//9N//8i/t+A//8A//8S/l/s//8y/r+J/h+M/l/i//f+//T/p/yfhf9P/L+V/a/5v4v7P73+P0v+X+z//6L//w3//5b+z+//I/3f0P9f6P8H9f9z/r/Y//f6vyP7H6v/B//f8v9n+//R/tfsv73+j+//i/i/of+/w//v8H//4H//yr/H+H//5H/38L/H+T/G/7fi/4f9X+T//8a/r9E//8M//8d//8c/r+o//+u/z/0f4T/V/n/kf+/wv8f6f+P//+T//9p//8q/18K/7/g/0tG/2/R/n8F/X8B/2+e/R9q/s8U/T/Z//f7f7P+b+r/N/y/1f1n+v/J/w/n/zv8/yr+vyD+H5b+L7L/Rftfg/+//t+W/l/9f7L+//D+D77/g/+f5X/t/y/p/zv8f1P/n9z/R/r/+f5fk/+f6v6X/L+4//8B//9N//9M/79B//8a//8K//8C/r/F/+f+/8X//xn//2H//wn//xr/H8H/N/V/iP9/+v+5//+p//8M//9i//9p//9F//8A//8C/v9q/Z+2/o8R/j8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/y/o/x/yf+f4fxH/b+//Cvu/of+/4v/f+H89//9b//9Q//8s/h/+/xP/H7v/Nf4/qf/X7P+V//fy//f+fxH//6j//0z/v1r/P8H/B/6/0f8L93+H//9U//+T//+q//8o//9F//+B//8l/r+E//9U//8q//8K//8o//8c//8I/b+z//+A//8R/b9s/1ey/h8C/z9e+L/l+d/o/wv2v9r97+r+D+X/X2P/T+h/Yf/foP8r8r8l+z8A//9p//8o//9R//8A//+C//+y//8N//9B//fK//8A//+0//sR/p8s+j+E/9/l/lfzf53//wT/fwr//xD/Hwr/PwP//+L//wD//7H//0L//7H//w3//w3/byz+/yr//yj/r8r/l/b/a/+fpf8f6v/n/X/R/8v9X8L//2X//yz/Hyr+P4T/P8P//wj/v6X//7j/7/H//z3//6z/3yX1H6L//yr/Pwr/3wj/3yj/vyn1X/J/2f6v4H8j+L+1/V9V/y/yv8H/9/B/of6P8v93+//g/t/V/yP5v8T//xT/r4H//4L/H5b//yr//xj/vxD/b5b//wr//2D//wz//xD/P8T//xj/vyH/XyD/X4P/vwj/bwr/v5H+L8r+Z/X/1/+/sv8/+v+L/b/y/9v8X9z/B//f4v+n+78Z/b8t/t9A/i9t/xfs/0P/fwr+/7D/H/S/h/0/0v5P/L+v/S/1/4D/f5L6vwL+vzH+/8T//6z//7j/r/v/8v5/+f9T+r+z+3/7/wP+//f/p/2fkv+P6f/P0P8H+j/1//es/b+V/o8S/D86/V+C/9/h/kfzf+v//7D//4L//43/Nf5/Yf+f5/+d/e/2/+P+v57//1n/P8H/B/6/sf+f6f8j+r+A//9t//8N/78V/l8S//eB//9g/7/p/436/+T+z+L/5/9/Y/8/gP//Zf8/pf5fo/+v6v5L/F+5/6/ov+T+T+P/1/V/a/1f3P6v//8A//+E/6+y/r+r/t+A/69A/zfY/+/4P//+B//fg/+/+v5z/P9f/2f3v73//93//27/n+b/q/o/w/+v4v9b+z+c/8f5f13/P9f/L+j/K/2/5v5b/P/6f9/wvyH8Pwz/bwr/H+H//5H/3wr/Hwr/vwn9Xz7//zD/3wr//0H/bwr/7wr/vy7+3wT+3xH/v7H+Pyj+/zT//wb//yH/r2L/V/S/3/836v/D/g/q//P8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" alt="Logo" class="logo">',
        "{{NOME_CLIENTE}}": dadosCredito.nomeCliente.toUpperCase() || "N/A",
        "{{TIPO_BEM}}": dadosCredito.tipoBem.toUpperCase() || "N/A",
        "{{ADMIN_NOME}}": dadosCredito.admin.toUpperCase() || "N/A",
        "{{VALOR_CREDITO}}": formatarMoeda(dadosCredito.valorCredito),
        "{{CREDITO_LIQUIDO}}": comLance
          ? formatarMoeda(resultado.creditoLiquido)
          : "",
        "{{PERC_REDUTOR}}": (resultado.percentualRedutor || 0)
          .toFixed(2)
          .replace(".", ","),
        "{{PARCELA_COM_REDUTOR}}": formatarMoeda(resultado.parcelaComRedutor),
        "{{PARCELA_INTEGRAL}}": `<s>${formatarMoeda(
          resultado.parcelaOriginal
        )}</s>`,
        "{{NOVA_PARCELA}}": comLance
          ? formatarMoeda(resultado.parcelaPosContemplacao)
          : "",
        "{{PRAZO_RESTANTE}}": `${
          comLance ? resultado.prazoComLance : dadosCredito.numeroParcelas
        } Meses`,
        "{{PERC_LANCE}}": comLance
          ? `${(resultado.lance.percentualOfertado || 0)
              .toFixed(2)
              .replace(".", ",")}%`
          : "",
        "{{RECURSO_PROPRIO}}": comLance
          ? formatarMoeda(resultado.lance.valorDoBolso)
          : "",
        "{{LANCE_EMBUTIDO}}": comLance
          ? formatarMoeda(resultado.lance.valorEmbutido)
          : "",
        "{{TIPO_LANCE}}": comLance
          ? (resultado.lance.tipo || "N/A").replace(/_/g, " ").toUpperCase()
          : "",
        "{{QTD_PARCELAS_ADESAO}}": dadosCredito.formaPagamentoAdesao || 0,
        "{{VALOR_PARCELA_ADESAO}}": formatarMoeda(
          resultado.parcelaComRedutor + resultado.adesaoMensal
        ),
        "{{DATA_SIMULACAO}}": new Date().toLocaleDateString("pt-BR"),
        "{{NOME_USUARIO}}": "Simulador Web",
        "{{LANCE_INFO_STYLE}}": comLance ? "" : "display: none;",
        "{{ESTILO_DESTAQUE_SEM_LANCE}}": !comLance
          ? "color: rgb(136, 201, 38); font-size: 1.2em;"
          : "",
      };

      let htmlFinal = htmlTemplate;
      for (const [key, value] of Object.entries(placeholders)) {
        htmlFinal = htmlFinal.replace(new RegExp(key, "g"), value);
      }

      const container = document.createElement("div");
      container.style.position = "absolute";
      container.style.left = "-9999px";
      container.style.top = "0px";
      container.style.width = "210mm";
      container.innerHTML = htmlFinal;
      document.body.appendChild(container);

      const canvas = await html2canvas(
        container.querySelector(".pdf-wrapper"),
        {
          scale: 2.5,
          useCORS: true,
          backgroundColor: "#0A183D",
        }
      );

      document.body.removeChild(container);

      const imgData = canvas.toDataURL("image/png");
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${dadosCredito.nomeCliente.replace(/ /g, "_")}_simulacao.pdf`);
    } catch (err) {
      console.error("Erro completo ao gerar PDF:", err);
      if (erroSimulacaoP) {
        erroSimulacaoP.textContent =
          "Erro ao gerar o PDF. Verifique o console para detalhes.";
        erroSimulacaoP.style.display = "block";
      }
    } finally {
      btnImprimirPDF.disabled = false;
      btnImprimirPDF.textContent = "Imprimir Simulação em PDF";
    }
  }

  function exibirResultados(data, dadosCredito) {
    const {
      lance,
      parcelaComRedutor,
      parcelaOriginal,
      creditoLiquido,
      parcelaPosContemplacao,
      prazoComLance,
      adesaoMensal,
      percentualRedutor,
    } = data;

    const { admin, tipoBem, valorCredito, nomeCliente } = dadosCredito;
    const nomeUsuarioLogado = "Simulador Web"; // API de usuario.

    if (resultadoNomeCliente) {
      resultadoNomeCliente.textContent = nomeCliente || "Não informado";
    }
    if (nomeAdminResultado) {
      nomeAdminResultado.textContent = admin ? admin.toUpperCase() : "--";
    }
    if (tipoBemResultado) {
      tipoBemResultado.textContent = tipoBem ? tipoBem.toUpperCase() : "--";
    }
    if (resultadoCreditoContratado) {
      resultadoCreditoContratado.textContent = formatarMoeda(valorCredito);
    }

    const comLance = lance && lance.tipo !== "nenhum";

    const parcelaComRedutorEl = document.getElementById(
      "resultadoParcelaComRedutor"
    );
    if (parcelaComRedutorEl) {
      parcelaComRedutorEl.textContent = formatarMoeda(parcelaComRedutor);
      if (!comLance) {
        parcelaComRedutorEl.style.color = "rgb(136, 201, 38)";
        parcelaComRedutorEl.style.fontSize = "1.25em";
        parcelaComRedutorEl.style.fontWeight = "700";
      } else {
        parcelaComRedutorEl.style.color = "";
        parcelaComRedutorEl.style.fontSize = "";
        parcelaComRedutorEl.style.fontWeight = "";
      }
    }
    const containerParcelaComRedutor = document.getElementById("containerParcelaComRedutor");
const resultadoParcelaBaseSemRedutor = document.getElementById("resultadoParcelaBaseSemRedutor");

if (percentualRedutor > 0) {

    setElementVisibility(containerParcelaComRedutor, true);
    
    const parcelaComRedutorEl = document.getElementById("resultadoParcelaComRedutor");
    if (parcelaComRedutorEl) {
        parcelaComRedutorEl.textContent = formatarMoeda(parcelaComRedutor);
        parcelaComRedutorEl.style.color = 'rgb(136, 201, 38)';
        parcelaComRedutorEl.style.fontSize = '1.25em';
        parcelaComRedutorEl.style.fontWeight = '700';
    }

    // Preenche a porcentagem do redutor
    const resultadoPercentualRedutorEl = document.getElementById("resultadoPercentualRedutor");
    if (resultadoPercentualRedutorEl) {
        resultadoPercentualRedutorEl.textContent = `${(percentualRedutor || 0).toFixed(2).replace(".", ",")}`;
    }

    // Mostra a "Parcela Integral" com risco e SEM destaque
    if (resultadoParcelaBaseSemRedutor) {
        resultadoParcelaBaseSemRedutor.innerHTML = `<s>${formatarMoeda(parcelaOriginal)}</s>`;
        resultadoParcelaBaseSemRedutor.style.color = '';
        resultadoParcelaBaseSemRedutor.style.fontSize = '';
        resultadoParcelaBaseSemRedutor.style.fontWeight = '';
    }

} else {

    setElementVisibility(containerParcelaComRedutor, false);

    if (resultadoParcelaBaseSemRedutor) {
        resultadoParcelaBaseSemRedutor.innerHTML = formatarMoeda(parcelaOriginal);
        resultadoParcelaBaseSemRedutor.style.color = 'rgb(136, 201, 38)';
        resultadoParcelaBaseSemRedutor.style.fontSize = '1.25em';
        resultadoParcelaBaseSemRedutor.style.fontWeight = '700';
    }
}

    const comRedutorAplicado = percentualRedutor > 0;
    setElementVisibility(
      document.getElementById("containerParcelaComRedutor"),
      comRedutorAplicado
    );
    if (comRedutorAplicado) {
      if (resultadoPercentualRedutor) {
        resultadoPercentualRedutor.textContent = `${(percentualRedutor || 0)
          .toFixed(2)
          .replace(".", ",")}`;
      }
    }

    setElementVisibility(
      document.getElementById("resultadosComLance"),
      comLance
    );
    setElementVisibility(
      document.getElementById("resultadosComLance_novaParcela"),
      comLance
    );
    setElementVisibility(
      document.getElementById("containerCreditoLiquido"),
      comLance
    );

    if (comLance) {
      if (resultadoCreditoLiquido) {
        resultadoCreditoLiquido.textContent = formatarMoeda(creditoLiquido);
      }
      if (resultadoTipoLanceOfertado) {
        resultadoTipoLanceOfertado.textContent = (lance.tipo || "N/A")
          .replace(/_/g, " ")
          .toUpperCase();
      }
      if (resultadoPercentualLance) {
        resultadoPercentualLance.textContent = `${(
          lance.percentualOfertado || 0
        )
          .toFixed(2)
          .replace(".", ",")}%`;
      }
      if (resultadoValorEmbutidoUtilizado) {
        resultadoValorEmbutidoUtilizado.textContent = formatarMoeda(
          lance.valorEmbutido
        );
      }
      if (resultadoValorLanceDoBolso) {
        resultadoValorLanceDoBolso.textContent = formatarMoeda(
          lance.valorDoBolso
        );
      }
      if (resultadoParcelaPosContemplacao) {
        resultadoParcelaPosContemplacao.textContent = formatarMoeda(
          parcelaPosContemplacao
        );
      }
    }

    if (resultadoPrazoComLance) {
      resultadoPrazoComLance.textContent = `${prazoComLance} meses`;
    }

    const comAdesao = admin === "porto" && adesaoMensal > 0;
    setElementVisibility(
      document.getElementById("blocoResultadoAdesao"),
      comAdesao
    );
    if (comAdesao) {
      if (labelResultadoAdesao) {
        labelResultadoAdesao.textContent = `Adesão (${dadosCredito.adesao}% / ${dadosCredito.formaPagamentoAdesao}x)`;
      }
      if (valorResultadoAdesao) {
        valorResultadoAdesao.textContent = `${
          dadosCredito.formaPagamentoAdesao
        }x primeiras parcelas de ${formatarMoeda(
          parcelaComRedutor + adesaoMensal
        )}`;
      }
    }

    const resultadoGeradoPorSpan =
      document.getElementById("resultadoGeradoPor");
    const resultadoDataSimulacaoSpan = document.getElementById(
      "resultadoDataSimulacao"
    );

    if (resultadoGeradoPorSpan) {
      resultadoGeradoPorSpan.textContent = `Gerado Por: ${nomeUsuarioLogado}`;
    }
    if (resultadoDataSimulacaoSpan) {
      resultadoDataSimulacaoSpan.textContent = `Data da Simulação: ${new Date().toLocaleDateString(
        "pt-BR"
      )}`;
    }
    ultimoResultadoParaPdf = { resultado: data, dadosCredito: dadosCredito };
    setElementVisibility(areaResultadosSimulacaoDiv, true);

    setElementVisibility(areaResultadosSimulacao, true);
  }

  adminRadios.forEach((radio) =>
    radio.addEventListener("change", atualizarVisibilidadeCamposAdmin)
  );
  tipoBemRadios.forEach((radio) =>
    radio.addEventListener("change", atualizarVisibilidadeCamposBem)
  );

  if (portoAutomovelPercentualEmbutido) {
    portoAutomovelPercentualEmbutido.addEventListener("change", () => {
      const adminEl = document.querySelector(
        'input[name="administradora"]:checked'
      );
      const tipoBemEl = document.querySelector('input[name="tipoBem"]:checked');
      const valorCreditoInput = document.getElementById(
        "portoAutomovelValorCredito"
      );

      if (
        adminEl &&
        adminEl.value === "porto" &&
        tipoBemEl &&
        tipoBemEl.value === "automovel" &&
        valorCreditoInput
      ) {
        const valorCredito =
          getNumericValue(valorCreditoInput.value, "currency") || 0;
        atualizarAvisosMaxEmbutido("porto", "automovel", valorCredito);
      }
    });
  }

  document.querySelectorAll('input[name="tipoLance"]').forEach((radio) => {
    radio.addEventListener("change", atualizarVisibilidadeCamposLanceDetalhes);
  });

  if (btnSimular) {
    btnSimular.addEventListener("click", simularConsorcio);
  }
  if (btnImprimirPDF) {
    btnImprimirPDF.addEventListener("click", gerarPDF);
  }

  ocultarTodasSecoesPrincipais();
  const adminSelecionadaInicialEl = document.querySelector(
    'input[name="administradora"]:checked'
  );
  if (adminSelecionadaInicialEl) {
    atualizarVisibilidadeCamposAdmin();
    const tipoBemSelecionadoInicialEl = document.querySelector(
      'input[name="tipoBem"]:checked'
    );
    if (tipoBemSelecionadoInicialEl) {
      atualizarVisibilidadeCamposBem();
    }
  }
  toggleDetalhesEmbutido();

  console.log(
    "[Simulador Parcelas] Configuração inicial e listeners de evento configurados."
  );
})();
