const axios = require("axios");
const puppeteer = require("puppeteer"); // Você precisará instalar: npm install puppeteer
require("dotenv").config();
const express = require("express");
let ultimoDiaVerificado = new Date().getDate(); // Dia do mês atual

// Estado do bot
let historico = [];
let alertaAtivo = false;

// Estratégia de cores
let corAlvo = null;
let rodadaG0Cor = null;
let totalGreensCor = 0;
let totalRedsCor = 0;

// Estratégia de colunas
let colunaAlvo = null;
let rodadaG0Coluna = null;
let totalGreensColuna = 0;
let totalRedsColuna = 0;

// Estratégia de dúzias
let duziaAlvo = null;
let rodadaG0Duzia = null;
let totalGreensDuzia = 0;
let totalRedsDuzia = 0;

// Contador de zeros
let totalZeros = 0;

// Rastreamento de sequências de cores
let sequenciaAtualVermelho = 0;
let sequenciaAtualPreto = 0;
let maiorSequenciaVermelho = 0;
let maiorSequenciaPreto = 0;
let corUltimoNumero = null;

// Rastreamento de padrões laterais (últimos 8 números)
let ultimosOitoNumeros = [];

// Contador geral
let contadorRodadas = 0;

// Última vitória registrada
let ultimaVitoria = {
  numero: null,
  cor: null,
  estrategia: null,
  dataHora: null,
};

// Configuração do Telegram
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Números vermelhos na roleta
const numerosVermelhos = [
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
];

// Funções auxiliares
function getCor(numero) {
  if (numero === 0) return "verde";
  if (numerosVermelhos.includes(numero)) return "vermelho";
  return "preto";
}

function getColuna(numero) {
  if (numero === 0) return null;
  return ((numero - 1) % 3) + 1;
}

function getDuzia(numero) {
  if (numero === 0) return null;
  if (numero <= 12) return 1;
  if (numero <= 24) return 2;
  return 3;
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Função para rastrear sequências de cores
function rastrearSequencias(res) {
  // Ignorar o Zero para fins de rastreamento de sequências de cores
  if (res.numero === 0) {
    // Zeros interrompem sequências de cores
    sequenciaAtualVermelho = 0;
    sequenciaAtualPreto = 0;
    corUltimoNumero = null;
    return;
  }

  // Rastrear sequências de cores
  if (res.cor === "vermelho") {
    // Se o número anterior também era vermelho, incrementa a sequência
    if (corUltimoNumero === "vermelho") {
      sequenciaAtualVermelho++;
    } else {
      // Começa uma nova sequência de vermelhos
      sequenciaAtualVermelho = 1;
    }

    // Reseta a sequência atual de pretos, pois a sequência foi interrompida
    sequenciaAtualPreto = 0;

    // Verifica se a sequência atual de vermelhos é a maior já registrada
    if (sequenciaAtualVermelho > maiorSequenciaVermelho) {
      maiorSequenciaVermelho = sequenciaAtualVermelho;
      console.log(
        `Nova maior sequência de vermelhos: ${maiorSequenciaVermelho} números consecutivos`
      );

      // Notifica sobre a nova maior sequência
      if (maiorSequenciaVermelho >= 5) {
        enviarTelegram(`🔥 NOVA MAIOR SEQUÊNCIA: ${maiorSequenciaVermelho} vermelhos consecutivos!
Esta é a maior sequência de números vermelhos consecutivos detectada até agora.`);
      }
    }
  } else if (res.cor === "preto") {
    // Se o número anterior também era preto, incrementa a sequência
    if (corUltimoNumero === "preto") {
      sequenciaAtualPreto++;
    } else {
      // Começa uma nova sequência de pretos
      sequenciaAtualPreto = 1;
    }

    // Reseta a sequência atual de vermelhos, pois a sequência foi interrompida
    sequenciaAtualVermelho = 0;

    // Verifica se a sequência atual de pretos é a maior já registrada
    if (sequenciaAtualPreto > maiorSequenciaPreto) {
      maiorSequenciaPreto = sequenciaAtualPreto;
      console.log(
        `Nova maior sequência de pretos: ${maiorSequenciaPreto} números consecutivos`
      );

      // Notifica sobre a nova maior sequência
      if (maiorSequenciaPreto >= 5) {
        enviarTelegram(`⚫ NOVA MAIOR SEQUÊNCIA: ${maiorSequenciaPreto} pretos consecutivos!
Esta é a maior sequência de números pretos consecutivos detectada até agora.`);
      }
    }
  }

  // Atualiza a cor do último número para a próxima comparação
  corUltimoNumero = res.cor;

  // Informações de debug para o console
  console.log(`Sequência atual de vermelhos: ${sequenciaAtualVermelho}`);
  console.log(`Sequência atual de pretos: ${sequenciaAtualPreto}`);
  console.log(
    `Maior sequência de vermelhos registrada: ${maiorSequenciaVermelho}`
  );
  console.log(`Maior sequência de pretos registrada: ${maiorSequenciaPreto}`);
}

// Armazenar o último resultado processado para comparação
let ultimoResultadoProcessado = null;

// Variáveis globais para controlar o navegador
let browser = null;
let page = null;

// Função principal modificada para manter o navegador aberto
async function getRoletaResultado() {
  try {
    console.log("Buscando resultados da roleta...");

    // Inicializar o navegador apenas uma vez
    if (!browser) {
      console.log("Iniciando navegador pela primeira vez...");
      browser = await puppeteer.launch({
        executablePath:
          "/root/.cache/puppeteer/chrome/linux-136.0.7103.92/chrome-linux64/chrome",
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
      
      console.log("Abrindo nova página...");
      page = await browser.newPage();
      
      // Configurando o User-Agent para parecer um navegador normal
      await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
      );
    } else {
      console.log("Navegador já está aberto, apenas atualizando a página...");
    }

    // Verificar mudança de dia a cada execução
    verificarMudancaDeDia();

    // Navegar ou recarregar a página
    if (page.url() === "https://casinoscores.com/lightning-roulette/") {
      console.log("Recarregando a página...");
      await page.reload({ waitUntil: "networkidle2", timeout: 60000 });
    } else {
      console.log("Navegando para casinoscores.com...");
      await page.goto("https://casinoscores.com/lightning-roulette/", {
        waitUntil: "networkidle2",
        timeout: 60000,
      });
    }

    console.log("Página carregada, extraindo resultados...");

    // Esperando pelo conteúdo carregar
    await page
      .waitForSelector("#latestSpinsTag", { timeout: 30000 })
      .catch(() =>
        console.log("Timeout ao esperar pelo seletor, tentando mesmo assim...")
      );

    // Extraindo os números usando o seletor específico
    const numeros = await page.evaluate(() => {
      const resultados = [];
      const elementos = document.querySelectorAll("#latestSpinsTag .badge");

      elementos.forEach((elem) => {
        const numero = parseInt(elem.textContent.trim(), 10);
        if (!isNaN(numero) && numero >= 0 && numero <= 36) {
          resultados.push(numero);
        }
      });

      return resultados;
    });

    if (!numeros || numeros.length === 0) {
      console.error("Não foi possível encontrar números da roleta.");
      return;
    }

    console.log(
      `Encontrados ${numeros.length} resultados: ${numeros.join(", ")}`
    );

    // Pegamos o resultado mais recente (primeiro da lista)
    const ultimoNumero = numeros[0];
    const ultimaCor = getCor(ultimoNumero);

    const resultado = {
      numero: ultimoNumero,
      cor: ultimaCor,
    };

    console.log(
      `Último resultado do site: ${resultado.numero} (${resultado.cor})`
    );

    // Resto do seu código para verificar novos resultados continua igual
    let novoResultado = false;

    if (!ultimoResultadoProcessado) {
      novoResultado = true;
      console.log("Primeiro resultado desde o início do programa.");
    } else if (ultimoResultadoProcessado.numero !== resultado.numero) {
      novoResultado = true;
      console.log(
        `Novo número detectado: ${resultado.numero} (anterior era ${ultimoResultadoProcessado.numero})`
      );
    } else if (
      numeros.length >= 2 &&
      ultimoResultadoProcessado.segundoNumero !== numeros[1]
    ) {
      novoResultado = true;
      console.log(
        `Mesmo número (${resultado.numero}), mas o segundo número da lista mudou de ${ultimoResultadoProcessado.segundoNumero} para ${numeros[1]}. Considerando nova rodada.`
      );
    } else {
      console.log(
        `Sem mudanças nos resultados. Último número continua sendo ${resultado.numero}.`
      );
    }

    if (novoResultado) {
      console.log("Novo resultado confirmado, atualizando histórico...");

      // Atualiza o histórico
      historico.unshift(resultado);
      if (historico.length > 20) historico = historico.slice(0, 20);

      // Rastreia sequências de cores
      rastrearSequencias(resultado);

      // Processa o resultado (estratégias)
      await processarResultado(resultado);

      // Atualiza o resultado processado, incluindo o segundo número para comparação futura
      ultimoResultadoProcessado = {
        numero: resultado.numero,
        cor: resultado.cor,
        segundoNumero: numeros.length >= 2 ? numeros[1] : null,
      };
    } else {
      // Nenhuma mudança nos resultados
      console.log("Aguardando nova rodada da roleta...");
    }
  } catch (err) {
    console.error("Erro ao capturar resultado:", err.message);
    
    // Se ocorrer um erro grave com o navegador, fechamos e reiniciamos na próxima execução
    if (err.message.includes("Protocol error") || err.message.includes("Target closed") || err.message.includes("Session closed")) {
      console.error("Erro de conexão com o navegador, reiniciando na próxima execução...");
      try {
        if (page) await page.close().catch(() => {});
        if (browser) await browser.close().catch(() => {});
      } catch (closeErr) {
        console.error("Erro ao fechar navegador:", closeErr.message);
      }
      page = null;
      browser = null;
    }
    
    if (err.response) {
      console.error("Resposta do site:", err.response.status);
      if (err.response.data) {
        console.error(
          "HTML da resposta:",
          err.response.data.substring(0, 200) + "..."
        );
      }
    }
  }
}
// Adicione também uma função para gerenciar o encerramento do processo
process.on('SIGINT', async () => {
  console.log('Encerrando bot graciosamente...');
  if (browser) {
    console.log('Fechando navegador...');
    await browser.close().catch(err => console.error("Erro ao fechar navegador:", err));
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Recebido sinal de término...');
  if (browser) {
    console.log('Fechando navegador...');
    await browser.close().catch(err => console.error("Erro ao fechar navegador:", err));
  }
  process.exit(0);
});

// Estratégia baseada em cores (3 cores iguais seguidas) - CORRIGIDA
async function processarEstrategiaCores(res) {
  // Verifica se há um padrão de 3 cores iguais consecutivas
  if (!alertaAtivo && !corAlvo && !colunaAlvo && !duziaAlvo && historico.length >= 3) {
    // Importante: analisar da direita para a esquerda
    // No contexto do nosso histórico, isso significa pegar os índices 2, 1, 0
    // porque o histórico vai do mais recente (índice 0) para o mais antigo
    const sequencia = [historico[2], historico[1], historico[0]];
    const [direita, meio, esquerda] = sequencia;
    
    console.log(`Analisando sequência da direita para a esquerda: ${direita.numero} (${direita.cor}), ${meio.numero} (${meio.cor}), ${esquerda.numero} (${esquerda.cor})`);
    
    // Verificamos se o último número vencedor ainda está na sequência que estamos analisando
    let deveIgnorar = false;
    
    if (ultimaVitoria && ultimaVitoria.numero !== null) {
      if (sequencia.some(item => item.numero === ultimaVitoria.numero)) {
        console.log(`Ignorando verificação, pois o número vencedor (${ultimaVitoria.numero}) ainda está na sequência analisada.`);
        deveIgnorar = true;
      }
    }
    
    if (!deveIgnorar) {
      console.log(`Verificando padrão de cores (D→E): ${direita.cor}, ${meio.cor}, ${esquerda.cor}`);
      if (direita.cor === meio.cor && meio.cor === esquerda.cor && direita.cor !== "verde") {
        alertaAtivo = true;
        corAlvo = direita.cor;
        await enviarTelegram(
          `⚠️ ESTRATÉGIA DE CORES: 3 ${corAlvo}s seguidos...\nAguardando próxima rodada para estratégia de cores...`
        );
        console.log(`Alerta ativado para cor! Cor alvo: ${corAlvo}`);
      }
    }
  }
  // Primeira rodada após detectar padrão para cores (G0)
  else if (
    alertaAtivo &&
    corAlvo &&
    rodadaG0Cor === null &&
    !colunaAlvo &&
    !duziaAlvo
  ) {
    console.log(
      `Alerta ativo para cor, primeira tentativa (G0). Cor alvo: ${corAlvo}`
    );

    if (res.numero === 0) {
      totalZeros++;
      totalGreensCor++;
      await enviarTelegram(
        `🟢 CORES: Número 0 caiu! ✅ Green para estratégia de cor\n📊 Cores: Greens: ${totalGreensCor} | Reds: ${totalRedsCor} | Zeros: ${totalZeros}`
      );

      // Marcar este número como vencedor
      ultimaVitoria = {
        numero: res.numero,
        cor: res.cor,
        dataHora: new Date(),
        estrategia: "cor",
      };
      console.log(
        `Marcando ${res.numero} como última vitória. Próxima contagem começará depois deste número.`
      );

      resetarAlertaCores();
    } else if (res.cor === corAlvo) {
      totalGreensCor++;
      await enviarTelegram(
        `🟢 CORES: ${capitalize(corAlvo)} [${
          res.numero
        }], ✅ Green para estratégia de cor!\n📊 Cores: Greens: ${totalGreensCor} | Reds: ${totalRedsCor} | Zeros: ${totalZeros}`
      );

      // Marcar este número como vencedor
      ultimaVitoria = {
        numero: res.numero,
        cor: res.cor,
        dataHora: new Date(),
        estrategia: "cor",
      };
      console.log(
        `Marcando ${res.numero} como última vitória. Próxima contagem começará depois deste número.`
      );

      resetarAlertaCores();
    } else {
      await enviarTelegram(
        `🔄 CORES: ${capitalize(res.cor)} [${
          res.numero
        }], vamos para o G1 na estratégia de cor...`
      );
      rodadaG0Cor = res;
      console.log(
        "Primeira tentativa falhou, indo para G1 na estratégia de cor"
      );
    }
  }
  // Segunda rodada após detectar padrão para cores (G1)
  else if (alertaAtivo && corAlvo && rodadaG0Cor && !colunaAlvo && !duziaAlvo) {
    console.log("Processando G1 para estratégia de cor");

    if (res.numero === 0) {
      totalZeros++;
      totalGreensCor++;
      await enviarTelegram(
        `🟢 CORES: Número 0 caiu! ✅ Green no G1 para estratégia de cor\n📊 Cores: Greens: ${totalGreensCor} | Reds: ${totalRedsCor} | Zeros: ${totalZeros}`
      );

      // Marcar este número como vencedor
      ultimaVitoria = {
        numero: res.numero,
        cor: res.cor,
        dataHora: new Date(),
        estrategia: "cor",
      };
      console.log(
        `Marcando ${res.numero} como última vitória. Próxima contagem começará depois deste número.`
      );

      resetarAlertaCores();
    } else if (res.cor === corAlvo) {
      totalGreensCor++;
      await enviarTelegram(
        `🟢 CORES: ${capitalize(corAlvo)} [${
          res.numero
        }], ✅ Green no G1 para estratégia de cor!\n📊 Cores: Greens: ${totalGreensCor} | Reds: ${totalRedsCor} | Zeros: ${totalZeros}`
      );

      // Marcar este número como vencedor
      ultimaVitoria = {
        numero: res.numero,
        cor: res.cor,
        dataHora: new Date(),
        estrategia: "cor",
      };
      console.log(
        `Marcando ${res.numero} como última vitória. Próxima contagem começará depois deste número.`
      );

      resetarAlertaCores();
    } else {
      totalRedsCor++;
      await enviarTelegram(
        `❌ CORES: ${capitalize(res.cor)} [${
          res.numero
        }], ❌ Red/perca na estratégia de cor\n📊 Cores: Greens: ${totalGreensCor} | Reds: ${totalRedsCor} | Zeros: ${totalZeros}`
      );

      // Marcar este número para saber que a última derrota foi na estratégia de cores
      ultimaVitoria = {
        numero: res.numero,
        cor: res.cor,
        estrategia: "cor",
        dataHora: new Date(),
      };

      resetarAlertaCores();
    }
  }
}

// Função para resetar alerta de cores - MODIFICADA
function resetarAlertaCores() {
  console.log("Resetando alerta de cores");
  if (corAlvo) {
    alertaAtivo = false;
    corAlvo = null;
    rodadaG0Cor = null;

    console.log("Estratégia de cores resetada após vitória/derrota");
  }
}

// Estratégia baseada em colunas (8 números em 2 colunas)
async function processarEstrategiaColunas(res) {
  // Atualiza o array dos últimos 8 números, excluindo zeros
  if (res.numero !== 0) {
    // Adiciona o novo número no início do array
    ultimosOitoNumeros.unshift({
      numero: res.numero,
      coluna: getColuna(res.numero),
      duzia: getDuzia(res.numero),
    });

    // Mantém apenas os últimos 8 números não-zero
    if (ultimosOitoNumeros.length > 8) {
      ultimosOitoNumeros = ultimosOitoNumeros.slice(0, 8);
    }
  }

  // Verifica padrão de colunas apenas se não houver outro alerta ativo
  if (
    !alertaAtivo &&
    !corAlvo &&
    !colunaAlvo &&
    !duziaAlvo &&
    ultimosOitoNumeros.length === 8
  ) {
    // Verificar se temos uma última vitória recente na estratégia de colunas
    let deveIgnorar = false;

    if (
      ultimaVitoria &&
      ultimaVitoria.estrategia === "coluna" &&
      new Date() - ultimaVitoria.dataHora < 5 * 60 * 1000
    ) {
      // 5 minutos
      console.log(
        `Ignorando verificação de colunas, pois tivemos uma vitória/derrota recente na estratégia de colunas.`
      );
      deveIgnorar = true;
    }

    if (!deveIgnorar) {
      // Obtém as colunas dos últimos 8 números
      const colunas = ultimosOitoNumeros.map((n) => n.coluna);

      // Contabiliza quais colunas apareceram
      const contagemColunas = { 1: 0, 2: 0, 3: 0 };
      colunas.forEach((coluna) => contagemColunas[coluna]++);

      // Verifica se só apareceram 2 colunas distintas (ou seja, uma coluna não apareceu)
      const colunasDistintas = Object.keys(contagemColunas)
        .filter((c) => contagemColunas[c] > 0)
        .map((c) => parseInt(c, 10));

      if (colunasDistintas.length === 2) {
        // Agora utilizamos as colunas que estão aparecendo como alvo
        alertaAtivo = true;
        colunaAlvo = colunasDistintas; // colunaAlvo é um array com as colunas presentes
        const colunasPresentes = colunasDistintas.join(" e ");

        await enviarTelegram(`⚠️ ESTRATÉGIA DE COLUNAS: Os últimos 8 números caíram apenas nas colunas ${colunasPresentes}.
🎯 Entrada sugerida nas colunas ${colunasPresentes} na próxima rodada!`);

        console.log(
          `Alerta de colunas ativado! Colunas alvo: ${colunasPresentes}`
        );
      }
    }
  }

  // Primeira rodada após detectar padrão para colunas (G0)
  else if (
    alertaAtivo &&
    colunaAlvo &&
    rodadaG0Coluna === null &&
    !corAlvo &&
    !duziaAlvo
  ) {
    console.log(
      `Alerta ativo para coluna, primeira tentativa (G0). Colunas alvo: ${colunaAlvo.join(
        " e "
      )}`
    );

    if (res.numero === 0) {
      totalZeros++;
      totalGreensColuna++;
      await enviarTelegram(
        `🟢 COLUNAS: Número 0 caiu! ✅ Green para estratégia de coluna\n📊 Colunas: Greens: ${totalGreensColuna} | Reds: ${totalRedsColuna}`
      );

      // Marcar este número como vencedor
      ultimaVitoria = {
        numero: res.numero,
        cor: res.cor,
        estrategia: "coluna",
        dataHora: new Date(),
      };

      resetarAlertaColunas();
    } else if (colunaAlvo.includes(getColuna(res.numero))) {
      totalGreensColuna++;
      await enviarTelegram(
        `🟢 COLUNAS:  [${res.numero}] coluna ${getColuna(
          res.numero
        )}! ✅ Green para estratégia de coluna\n📊 Colunas: Greens: ${totalGreensColuna} | Reds: ${totalRedsColuna}`
      );

      // Marcar este número como vencedor
      ultimaVitoria = {
        numero: res.numero,
        cor: res.cor,
        estrategia: "coluna",
        dataHora: new Date(),
      };

      resetarAlertaColunas();
    } else {
      await enviarTelegram(
        `🔄 COLUNAS:  [${res.numero}]  coluna ${getColuna(
          res.numero
        )}, vamos para o G1 na estratégia de coluna...`
      );
      rodadaG0Coluna = res;
      console.log(
        "Primeira tentativa falhou, indo para G1 na estratégia de coluna"
      );
    }
  }
  // Segunda rodada após detectar padrão para colunas (G1)
  else if (
    alertaAtivo &&
    colunaAlvo &&
    rodadaG0Coluna &&
    !corAlvo &&
    !duziaAlvo
  ) {
    console.log("Processando G1 para estratégia de coluna");

    if (res.numero === 0) {
      totalZeros++;
      totalGreensColuna++;
      await enviarTelegram(
        `🟢 COLUNAS: Número 0 caiu! ✅ Green no G1 para estratégia de coluna\n📊 Colunas: Greens: ${totalGreensColuna} | Reds: ${totalRedsColuna}`
      );

      // Marcar este número como vencedor
      ultimaVitoria = {
        numero: res.numero,
        cor: res.cor,
        estrategia: "coluna",
        dataHora: new Date(),
      };

      resetarAlertaColunas();
    } else if (colunaAlvo.includes(getColuna(res.numero))) {
      totalGreensColuna++;
      await enviarTelegram(
        `🟢 COLUNAS:  [${res.numero}] coluna ${getColuna(
          res.numero
        )}! ✅ Green no G1 para estratégia de coluna\n📊 Colunas: Greens: ${totalGreensColuna} | Reds: ${totalRedsColuna}`
      );

      // Marcar este número como vencedor
      ultimaVitoria = {
        numero: res.numero,
        cor: res.cor,
        estrategia: "coluna",
        dataHora: new Date(),
      };

      resetarAlertaColunas();
    } else {
      totalRedsColuna++;
      await enviarTelegram(
        `❌ COLUNAS:  [${res.numero}]  coluna ${getColuna(
          res.numero
        )}. ❌ Red/perca na estratégia de coluna\n📊 Colunas: Greens: ${totalGreensColuna} | Reds: ${totalRedsColuna}`
      );

      // Após uma derrota, também marcaremos o estado para evitar contagens imediatas
      ultimaVitoria = {
        estrategia: "coluna",
        dataHora: new Date(),
      };

      resetarAlertaColunas();
    }
  }
}

// Função para resetar alerta de colunas - MODIFICADA
function resetarAlertaColunas() {
  console.log("Resetando alerta de colunas");
  if (colunaAlvo) {
    alertaAtivo = false;
    colunaAlvo = null;
    rodadaG0Coluna = null;

    // Limpar o histórico de últimos oito números para forçar uma nova contagem
    ultimosOitoNumeros = [];

    console.log(
      "Estratégia de colunas resetada após vitória/derrota. Histórico de 8 números reiniciado."
    );
  }
}

// Estratégia baseada em dúzias (8 números em 2 dúzias)
async function processarEstrategiaDuzias(res) {
  // Verificação de padrão de dúzias apenas se não houver outro alerta ativo
  if (
    !alertaAtivo &&
    !corAlvo &&
    !colunaAlvo &&
    !duziaAlvo &&
    ultimosOitoNumeros.length === 8
  ) {
    // Verificar se temos uma última vitória recente na estratégia de dúzias
    let deveIgnorar = false;

    if (
      ultimaVitoria &&
      ultimaVitoria.estrategia === "duzia" &&
      new Date() - ultimaVitoria.dataHora < 5 * 60 * 1000
    ) {
      // 5 minutos
      console.log(
        `Ignorando verificação de dúzias, pois tivemos uma vitória/derrota recente na estratégia de dúzias.`
      );
      deveIgnorar = true;
    }

    if (!deveIgnorar) {
      // Obtém as dúzias dos últimos 8 números
      const duzias = ultimosOitoNumeros.map((n) => n.duzia);

      // Contabiliza quais dúzias apareceram
      const contagemDuzias = { 1: 0, 2: 0, 3: 0 };
      duzias.forEach((duzia) => contagemDuzias[duzia]++);

      // Verifica se só apareceram 2 dúzias distintas (ou seja, uma dúzia não apareceu)
      const duziasDistintas = Object.keys(contagemDuzias)
        .filter((d) => contagemDuzias[d] > 0)
        .map((d) => parseInt(d, 10));

      if (duziasDistintas.length === 2) {
        // Agora utilizamos as dúzias que estão aparecendo como alvo
        alertaAtivo = true;
        duziaAlvo = duziasDistintas; // Agora duziaAlvo é um array com as dúzias presentes
        const duziasPresentes = duziasDistintas.join(" e ");

        await enviarTelegram(`⚠️ ESTRATÉGIA DE DÚZIAS: Os últimos 8 números caíram apenas nas dúzias ${duziasPresentes}.
🎯 Entrada sugerida nas dúzias ${duziasPresentes} na próxima rodada!`);

        console.log(
          `Alerta de dúzias ativado! Dúzias alvo: ${duziasPresentes}`
        );
      }
    }
  }

  // Primeira rodada após detectar padrão para dúzias (G0)
  else if (
    alertaAtivo &&
    duziaAlvo &&
    rodadaG0Duzia === null &&
    !corAlvo &&
    !colunaAlvo
  ) {
    console.log(
      `Alerta ativo para dúzia, primeira tentativa (G0). Dúzias alvo: ${duziaAlvo.join(
        " e "
      )}`
    );

    if (res.numero === 0) {
      totalZeros++;
      totalGreensDuzia++;
      await enviarTelegram(
        `🟢 DÚZIAS: Número 0 caiu! ✅ Green para estratégia de dúzia\n📊 Dúzias: Greens: ${totalGreensDuzia} | Reds: ${totalRedsDuzia}`
      );

      // Marcar este número como vencedor
      ultimaVitoria = {
        numero: res.numero,
        cor: res.cor,
        estrategia: "duzia",
        dataHora: new Date(),
      };

      resetarAlertaDuzias();
    } else if (duziaAlvo.includes(getDuzia(res.numero))) {
      totalGreensDuzia++;
      await enviarTelegram(
        `🟢 DÚZIAS: Número ${res.numero} na dúzia ${getDuzia(
          res.numero
        )}! ✅ Green para estratégia de dúzia\n📊 Dúzias: Greens: ${totalGreensDuzia} | Reds: ${totalRedsDuzia}`
      );

      // Marcar este número como vencedor
      ultimaVitoria = {
        numero: res.numero,
        cor: res.cor,
        estrategia: "duzia",
        dataHora: new Date(),
      };

      resetarAlertaDuzias();
    } else {
      await enviarTelegram(
        `🔄 DÚZIAS: Número ${res.numero} na dúzia ${getDuzia(
          res.numero
        )}, vamos para o G1 na estratégia de dúzia...`
      );
      rodadaG0Duzia = res;
      console.log(
        "Primeira tentativa falhou, indo para G1 na estratégia de dúzia"
      );
    }
  }
  // Segunda rodada após detectar padrão para dúzias (G1)
  else if (
    alertaAtivo &&
    duziaAlvo &&
    rodadaG0Duzia &&
    !corAlvo &&
    !colunaAlvo
  ) {
    console.log("Processando G1 para estratégia de dúzia");

    if (res.numero === 0) {
      totalZeros++;
      totalGreensDuzia++;
      await enviarTelegram(
        `🟢 DÚZIAS: Número 0 caiu! ✅ Green no G1 para estratégia de dúzia\n📊 Dúzias: Greens: ${totalGreensDuzia} | Reds: ${totalRedsDuzia}`
      );

      // Marcar este número como vencedor
      ultimaVitoria = {
        numero: res.numero,
        cor: res.cor,
        estrategia: "duzia",
        dataHora: new Date(),
      };

      resetarAlertaDuzias();
    } else if (duziaAlvo.includes(getDuzia(res.numero))) {
      totalGreensDuzia++;
      await enviarTelegram(
        `🟢 DÚZIAS: Número ${res.numero} na dúzia ${getDuzia(
          res.numero
        )}! ✅ Green no G1 para estratégia de dúzia\n📊 Dúzias: Greens: ${totalGreensDuzia} | Reds: ${totalRedsDuzia}`
      );

      // Marcar este número como vencedor
      ultimaVitoria = {
        numero: res.numero,
        cor: res.cor,
        estrategia: "duzia",
        dataHora: new Date(),
      };

      resetarAlertaDuzias();
    } else {
      totalRedsDuzia++;
      await enviarTelegram(
        `❌ DÚZIAS: Número ${res.numero} na dúzia ${getDuzia(
          res.numero
        )}. ❌ Red/perca na estratégia de dúzia\n📊 Dúzias: Greens: ${totalGreensDuzia} | Reds: ${totalRedsDuzia}`
      );

      // Após uma derrota, também marcaremos o estado para evitar contagens imediatas
      ultimaVitoria = {
        estrategia: "duzia",
        dataHora: new Date(),
      };

      resetarAlertaDuzias();
    }
  }
}

// Função para resetar alerta de dúzias - MODIFICADA
function resetarAlertaDuzias() {
  console.log("Resetando alerta de dúzias");
  if (duziaAlvo) {
    alertaAtivo = false;
    duziaAlvo = null;
    rodadaG0Duzia = null;

    // Limpar o histórico de últimos oito números para forçar uma nova contagem
    ultimosOitoNumeros = [];

    console.log(
      "Estratégia de dúzias resetada após vitória/derrota. Histórico de 8 números reiniciado."
    );
  }
}

// Processa o último resultado e atualiza as estratégias
async function processarResultado(res) {
  console.log(`Processando resultado: ${res.numero} (${res.cor})`);
  contadorRodadas++;

  // Log detalhado do estado atual para depuração
  console.log(`--- ESTADO ATUAL ---`);
  console.log(`Alerta ativo: ${alertaAtivo}`);
  console.log(`Cor alvo: ${corAlvo}`);
  console.log(`Coluna alvo: ${colunaAlvo ? colunaAlvo.join(",") : "null"}`);
  console.log(`Dúzia alvo: ${duziaAlvo ? duziaAlvo.join(",") : "null"}`);
  console.log(`Última vitória: ${JSON.stringify(ultimaVitoria)}`);
  console.log(`Total números no histórico: ${historico.length}`);
  console.log(
    `Total números em ultimosOitoNumeros: ${ultimosOitoNumeros.length}`
  );
  console.log(`-------------------`);

  // Processa estratégia de cores
  await processarEstrategiaCores(res);

  // Processa estratégia de colunas
  await processarEstrategiaColunas(res);

  // Processa estratégia de dúzias
  await processarEstrategiaDuzias(res);

  // Envia resumo a cada 100 rodadas
  if (contadorRodadas % 100 === 0) {
    await enviarResumo();
  }

  // Envia relatório detalhado a cada 200 rodadas
  if (contadorRodadas % 200 === 0) {
    await enviarRelatorioDetalhado();
  }
}

// Envia mensagem para o Telegram
async function enviarTelegram(mensagem) {
  try {
    console.log(`Enviando para Telegram: ${mensagem}`);
    const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;

    const response = await axios.post(url, {
      chat_id: TELEGRAM_CHAT_ID,
      text: mensagem,
    });

    console.log("Mensagem enviada com sucesso");
    return response;
  } catch (err) {
    console.error("Erro ao enviar mensagem para o Telegram:", err.message);
    if (err.response) {
      console.error("Resposta do Telegram:", err.response.data);
    }
  }
}

// Envia resumo das estatísticas
async function enviarResumo() {
  await enviarTelegram(`📊 RESUMO PARCIAL (últimas ${contadorRodadas} rodadas):
✅ CORES: Greens: ${totalGreensCor} | Reds: ${totalRedsCor} 
✅ COLUNAS: Greens: ${totalGreensColuna} | Reds: ${totalRedsColuna} 
✅ DÚZIAS: Greens: ${totalGreensDuzia} | Reds: ${totalRedsDuzia}
🟢 Total de Zeros: ${totalZeros}
📈 Total de rodadas: ${contadorRodadas}
🔴 Maior sequência de vermelhos: ${maiorSequenciaVermelho}
⚫ Maior sequência de pretos: ${maiorSequenciaPreto}`);
}

// Função para relatório detalhado a cada 200 rodadas
async function enviarRelatorioDetalhado() {
  await enviarTelegram(`🔍 RELATÓRIO DETALHADO (RODADA #${contadorRodadas})

🎲 ESTATÍSTICAS DE CORES:
✅ Greens: ${totalGreensCor} (${Math.round(
    (totalGreensCor / (totalGreensCor + totalRedsCor || 1)) * 100
  )}% de aproveitamento)
❌ Reds: ${totalRedsCor}
🔴 Maior sequência de vermelhos: ${maiorSequenciaVermelho}
⚫ Maior sequência de pretos: ${maiorSequenciaPreto}

🎲 ESTATÍSTICAS DE COLUNAS:
✅ Greens: ${totalGreensColuna} (${Math.round(
    (totalGreensColuna / (totalGreensColuna + totalRedsColuna || 1)) * 100
  )}% de aproveitamento)
❌ Reds: ${totalRedsColuna}

🎲 ESTATÍSTICAS DE DÚZIAS:
✅ Greens: ${totalGreensDuzia} (${Math.round(
    (totalGreensDuzia / (totalGreensDuzia + totalRedsDuzia || 1)) * 100
  )}% de aproveitamento)
❌ Reds: ${totalRedsDuzia}

🟢 Total de Zeros: ${totalZeros}
📈 Total de rodadas analisadas: ${contadorRodadas}

📱 Bot monitorando 24/7 - Mantenha as apostas responsáveis!`);
}

// Adicione esta nova função para enviar o relatório diário e reiniciar contadores
async function enviarRelatorioDiarioEReiniciar() {
  const hoje = new Date();
  const dataFormatada = hoje.toLocaleDateString('pt-BR', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric' 
  });
  
  await enviarTelegram(`📅 RELATÓRIO FINAL DO DIA - ${dataFormatada}

🎲 RESUMO DAS ÚLTIMAS 24 HORAS:
✅ CORES: Greens: ${totalGreensCor} | Reds: ${totalRedsCor} 
✅ COLUNAS: Greens: ${totalGreensColuna} | Reds: ${totalRedsColuna} 
✅ DÚZIAS: Greens: ${totalGreensDuzia} | Reds: ${totalRedsDuzia}
🟢 Total de Zeros: ${totalZeros}
📈 Total de rodadas analisadas: ${contadorRodadas}

🔴 Maior sequência de vermelhos: ${maiorSequenciaVermelho}
⚫ Maior sequência de pretos: ${maiorSequenciaPreto}

💯 TAXA DE APROVEITAMENTO:
🎯 Cores: ${Math.round((totalGreensCor / (totalGreensCor + totalRedsCor || 1)) * 100)}%
🎯 Colunas: ${Math.round((totalGreensColuna / (totalGreensColuna + totalRedsColuna || 1)) * 100)}%
🎯 Dúzias: ${Math.round((totalGreensDuzia / (totalGreensDuzia + totalRedsDuzia || 1)) * 100)}%

🔄 Contadores reiniciados para o novo dia.
📱 Bot continua monitorando 24/7 - Boas apostas!`);

  // Reinicia todos os contadores para o novo dia
  totalGreensCor = 0;
  totalRedsCor = 0;
  totalGreensColuna = 0;
  totalRedsColuna = 0;
  totalGreensDuzia = 0;
  totalRedsDuzia = 0;
  totalZeros = 0;
  contadorRodadas = 0;
  
  // Não reiniciamos as sequências máximas, pois são recordes históricos
  // Se quiser reiniciar também, descomente as linhas abaixo
  /*
  maiorSequenciaVermelho = 0;
  maiorSequenciaPreto = 0;
  */
  
  console.log("Contadores reiniciados para o novo dia.");
}

// Função para verificar a mudança de dia
function verificarMudancaDeDia() {
  const dataAtual = new Date();
  const diaAtual = dataAtual.getDate();
  
  // Se o dia mudou
  if (diaAtual !== ultimoDiaVerificado) {
    console.log(`Dia mudou de ${ultimoDiaVerificado} para ${diaAtual}. Enviando relatório diário e reiniciando contadores.`);
    
    // Envia o relatório do dia anterior e reinicia contadores
    enviarRelatorioDiarioEReiniciar();
    
    // Atualiza o dia verificado
    ultimoDiaVerificado = diaAtual;
  }
}


// Inicia o bot
(async function () {
  try {
    console.log("🎲 Bot da Roleta iniciado!");
    console.log("🔍 Monitorando resultados da Lightning Roulette...");

    // Envia mensagem inicial
    await enviarTelegram(
      "🎲 Bot da Roleta Lightning iniciado! Monitorando resultados..."
    );

    // Executa a primeira vez
    await getRoletaResultado();

    // Configura o intervalo para execução regular (a cada 15 segundos)
    console.log("⏱️ Configurando intervalo de execução a cada 30 segundos");
    setInterval(getRoletaResultado, 30000);
    console.log("⏱️ Configurando verificação de mudança de dia a cada minuto");
    setInterval(verificarMudancaDeDia, 60000); // Verifica a cada minuto
  } catch (err) {
    console.error("Erro fatal ao iniciar o bot:", err);
    // Tenta enviar mensagem de erro ao Telegram
    enviarTelegram("❌ Erro fatal ao iniciar o bot. Verifique os logs.").catch(
      () => {
        console.error(
          "Também não foi possível enviar mensagem de erro ao Telegram"
        );
      }
    );
  }
})();

// Inicia servidor Express para manter o bot vivo no Render
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("✅ Bot da Roleta está rodando!");
});

app.listen(PORT, () => {
  console.log(`🌐 Web service ativo na porta ${PORT}`);
});
