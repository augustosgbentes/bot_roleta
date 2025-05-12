const axios = require("axios");
const puppeteer = require("puppeteer"); // Você precisará instalar: npm install puppeteer
require("dotenv").config();
const express = require("express");
let ultimoDiaVerificado = new Date().getDate(); // Dia do mês atual

// Estado do bot
// Estado do bot
let historico = [];
let alertaAtivo = false;

// Estratégia de 5 cores
let corAlvo5 = null;
let rodadaG0Cor5 = null;
let totalGreensCor5 = 0;
let totalRedsCor5 = 0;
let ultimaVitoriaCor5 = null;
let alertaAtivoCor5 = false;
let vitoriaConsecutivaCor5 = 0;
let maiorVitoriaConsecutivaCor5 = 0;

// Estratégia de 3 cores
let corAlvo3 = null;
let rodadaG0Cor3 = null;
let totalGreensCor3 = 0;
let totalRedsCor3 = 0;
let ultimaVitoriaCor3 = null;
let alertaAtivoCor3 = false;
let vitoriaConsecutivaCor3 = 0;
let maiorVitoriaConsecutivaCor3 = 0;

// Estratégia de colunas
let colunaAlvo = null;
let rodadaG0Coluna = null;
let totalGreensColuna = 0;
let totalRedsColuna = 0;
let alertaAtivoColuna = false;
let vitoriaConsecutivaColuna = 0;
let maiorVitoriaConsecutivaColuna = 0;

// Estratégia de dúzias
let duziaAlvo = null;
let rodadaG0Duzia = null;
let totalGreensDuzia = 0;
let totalRedsDuzia = 0;
let alertaAtivoDuzia = false;
let vitoriaConsecutivaDuzia = 0;
let maiorVitoriaConsecutivaDuzia = 0;

// Contador de zeros
let totalZeros = 0;

// Contador de zeros específico para cada estratégia
let zerosCor5 = 0;
let zerosCor3 = 0;
let zerosColuna = 0;
let zerosDuzia = 0;

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

// Novas variáveis de última vitória específicas por estratégia
let ultimaVitoriaCincoC = {
  numero: null,
  cor: null,
  dataHora: null,
};

let ultimaVitoriaTrC = {
  numero: null,
  cor: null,
  dataHora: null,
};

let ultimaVitoriaCol = {
  numero: null,
  dataHora: null,
};

let ultimaVitoriaDz = {
  numero: null,
  dataHora: null,
};

// Configuração do Telegram
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Tokens e chat IDs para estratégias específicas
const TELEGRAM_TOKEN_CINCO_CORES = process.env.TELEGRAM_TOKEN_CINCO_CORES;
const TELEGRAM_CHAT_ID_CINCO_CORES = process.env.TELEGRAM_CHAT_ID_CINCO_CORES;

const TELEGRAM_TOKEN_COLUNAS_DUZIAS = process.env.TELEGRAM_TOKEN_COLUNAS_DUZIAS;
const TELEGRAM_CHAT_ID_COLUNAS_DUZIAS =
  process.env.TELEGRAM_CHAT_ID_COLUNAS_DUZIAS;

// Token e chat ID para Trio de Cores (3 cores)
const TELEGRAM_TOKEN_TRIO_CORES = process.env.TELEGRAM_TOKEN_TRIO_CORES;
const TELEGRAM_CHAT_ID_TRIO_CORES = process.env.TELEGRAM_CHAT_ID_TRIO_CORES;

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
// Função para recalcular as sequências de cores a partir do histórico
function recalcularSequencias() {
  if (historico.length === 0) return;

  let seqVermelho = 0;
  let seqPreto = 0;
  let maxVermelho = 0;
  let maxPreto = 0;

  // Começa do item mais recente (índice 0)
  for (let i = 0; i < historico.length; i++) {
    if (historico[i].cor === "vermelho") {
      seqVermelho++;
      seqPreto = 0;
      if (seqVermelho > maxVermelho) maxVermelho = seqVermelho;
    } else if (historico[i].cor === "preto") {
      seqPreto++;
      seqVermelho = 0;
      if (seqPreto > maxPreto) maxPreto = seqPreto;
    } else {
      // Zero ou outra cor
      seqVermelho = 0;
      seqPreto = 0;
    }
  }

  // Atualiza as sequências atuais e máximas
  sequenciaAtualVermelho = seqVermelho;
  sequenciaAtualPreto = seqPreto;

  // Se encontrou novas sequências máximas, atualiza e notifica
  if (maxVermelho > maiorSequenciaVermelho) {
    maiorSequenciaVermelho = maxVermelho;
    console.log(
      `Nova maior sequência de vermelhos: ${maiorSequenciaVermelho} números consecutivos`
    );

    // Notifica sobre a nova maior sequência
    if (maiorSequenciaVermelho >= 5) {
      enviarTelegram(
        `🔥 NOVA MAIOR SEQUÊNCIA: ${maiorSequenciaVermelho} vermelhos consecutivos!
Esta é a maior sequência de números vermelhos consecutivos detectada até agora.`,
        "cor"
      );
    }
  }

  if (maxPreto > maiorSequenciaPreto) {
    maiorSequenciaPreto = maxPreto;
    console.log(
      `Nova maior sequência de pretos: ${maiorSequenciaPreto} números consecutivos`
    );

    // Notifica sobre a nova maior sequência
    if (maiorSequenciaPreto >= 5) {
      enviarTelegram(
        `⚫ NOVA MAIOR SEQUÊNCIA: ${maiorSequenciaPreto} pretos consecutivos!
Esta é a maior sequência de números pretos consecutivos detectada até agora.`,
        "cor"
      );
    }
  }

  // Log das sequências
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
// Função principal modificada para ambiente Linux VPS
async function getRoletaResultado() {
  try {
    console.log("Buscando resultados da roleta...");

    // Inicializar o navegador apenas uma vez
    if (!browser) {
      console.log("Iniciando navegador pela primeira vez...");

      // Configuração específica para ambiente Linux em VPS
      const options = {
        executablePath:
          "/root/.cache/puppeteer/chrome/linux-136.0.7103.92/chrome-linux64/chrome",
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage", // Evita problemas de memória compartilhada no Linux
          "--disable-gpu", // Desativa aceleração de GPU
          "--disable-features=AudioServiceOutOfProcess", // Evita problemas de áudio
          "--disable-extensions", // Desativa extensões
          "--single-process", // Usa um único processo (pode ajudar em alguns casos)
          "--no-zygote", // Evita processo zygote (reduz risco de memória)
          "--no-first-run", // Ignora configurações de primeira execução
          "--ignore-certificate-errors", // Ignora erros de certificado
        ],
      };

      console.log("Configurando Puppeteer para ambiente Linux VPS...");

      // Verifica se o caminho foi especificado nas variáveis de ambiente
      if (process.env.CHROME_PATH) {
        console.log(
          `Usando caminho do Chrome especificado nas variáveis de ambiente: ${process.env.CHROME_PATH}`
        );
        options.executablePath = process.env.CHROME_PATH;
      } else {
        console.log(
          `Usando caminho padrão do Chrome para Linux: ${options.executablePath}`
        );
      }

      try {
        browser = await puppeteer.launch(options);
        console.log("Navegador iniciado com sucesso!");
      } catch (error) {
        console.error(`Erro ao iniciar o navegador: ${error.message}`);
        console.error("Tentando alternativas para executar o Chrome...");

        // Tente localizar o Chrome usando comando do sistema
        const { execSync } = require("child_process");
        try {
          // Tenta vários possíveis caminhos do Chrome/Chromium no Linux
          let chromePath = "";
          try {
            chromePath = execSync("which google-chrome").toString().trim();
          } catch (e) {
            try {
              chromePath = execSync("which chromium-browser").toString().trim();
            } catch (e) {
              try {
                chromePath = execSync("which chromium").toString().trim();
              } catch (e) {
                throw new Error(
                  "Nenhum executável do Chrome/Chromium encontrado."
                );
              }
            }
          }

          console.log(
            `Chrome/Chromium encontrado no sistema em: ${chromePath}`
          );
          options.executablePath = chromePath;
          browser = await puppeteer.launch(options);
          console.log("Navegador iniciado após usar localização alternativa!");
        } catch (fallbackError) {
          console.error(
            `Erro após tentativa alternativa: ${fallbackError.message}`
          );
          console.error(
            "Verifique se o Chrome ou Chromium está instalado no servidor."
          );
          throw new Error(
            "Não foi possível iniciar o navegador após tentativas alternativas."
          );
        }
      }

      console.log("Abrindo nova página...");
      page = await browser.newPage();

      // Configurando o User-Agent para parecer um navegador normal
      await page.setUserAgent(
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36"
      );

      // Otimizações adicionais para ambiente VPS
      await page.setRequestInterception(true);
      page.on("request", (request) => {
        // Bloquear recursos desnecessários para economizar largura de banda e CPU
        const blockedResourceTypes = ["image", "media", "font", "stylesheet"];
        if (
          blockedResourceTypes.includes(request.resourceType()) &&
          !request.url().includes("casinoscores.com") // só bloqueia recursos de terceiros
        ) {
          request.abort();
        } else {
          request.continue();
        }
      });

      // Limitar uso de memória e CPU
      await page.evaluate(() => {
        window.addEventListener("error", (e) => {
          if (e.message.includes("out of memory")) {
            console.error("Detectado erro de memória:", e);
          }
        });
      });
    } else {
      console.log("Navegador já está aberto, apenas atualizando a página...");
    }

    // Verificar mudança de dia a cada execução
    verificarMudancaDeDia();

    try {
      // Navegar ou recarregar a página com timeout aumentado
      if (page.url() === "https://casinoscores.com/lightning-roulette/") {
        console.log("Recarregando a página...");
        await page.reload({
          waitUntil: "networkidle2",
          timeout: 120000, // 2 minutos - mais tempo para ambiente VPS
        });
      } else {
        console.log("Navegando para casinoscores.com...");
        await page.goto("https://casinoscores.com/lightning-roulette/", {
          waitUntil: "networkidle2",
          timeout: 120000, // 2 minutos - mais tempo para ambiente VPS
        });
      }
    } catch (navigationError) {
      console.error(`Erro ao navegar: ${navigationError.message}`);
      console.log("Tentando continuar mesmo com erro de navegação...");
      // Tentar recuperar de erros de navegação
      await new Promise((r) => setTimeout(r, 5000)); // Espera 5 segundos antes de continuar
    }

    console.log("Página carregada, extraindo resultados...");

    // Esperando pelo conteúdo carregar com timeout aumentado
    await page
      .waitForSelector("#latestSpinsTag", { timeout: 60000 }) // 1 minuto
      .catch(() => {
        console.log(
          "Timeout ao esperar pelo seletor, tentando extrair mesmo assim..."
        );
      });

    // Extraindo os números usando o seletor específico
    const numeros = await page
      .evaluate(() => {
        try {
          const resultados = [];
          const elementos = document.querySelectorAll("#latestSpinsTag .badge");

          if (!elementos || elementos.length === 0) {
            console.error("Elementos não encontrados na página");
            return [];
          }

          elementos.forEach((elem) => {
            const numero = parseInt(elem.textContent.trim(), 10);
            if (!isNaN(numero) && numero >= 0 && numero <= 36) {
              resultados.push(numero);
            }
          });

          return resultados;
        } catch (evalError) {
          console.error("Erro durante execução no browser:", evalError.message);
          return [];
        }
      })
      .catch((error) => {
        console.error("Erro ao executar evaluate:", error.message);
        return [];
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
      recalcularSequencias();

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
    console.error("Stack trace:", err.stack);

    // Se ocorrer um erro grave com o navegador, fechamos e reiniciamos na próxima execução
    if (
      err.message.includes("Protocol error") ||
      err.message.includes("Target closed") ||
      err.message.includes("Session closed") ||
      err.message.includes("Browser was not found") ||
      err.message.includes("WebSocket") ||
      err.message.includes("failed to connect") ||
      err.message.includes("connection closed")
    ) {
      console.error(
        "Erro de conexão com o navegador, reiniciando na próxima execução..."
      );
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
process.on("SIGINT", async () => {
  console.log("Encerrando bot graciosamente...");
  if (browser) {
    console.log("Fechando navegador...");
    await browser
      .close()
      .catch((err) => console.error("Erro ao fechar navegador:", err));
  }
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("Recebido sinal de término...");
  if (browser) {
    console.log("Fechando navegador...");
    await browser
      .close()
      .catch((err) => console.error("Erro ao fechar navegador:", err));
  }
  process.exit(0);
});

// Estratégia baseada em trio de cores (3 cores iguais seguidas)

// Variáveis globais para controlar a sequência atual de 3 cores
let sequenciaAtual3Cores = []; // Armazena os números da sequência atual de 3 cores
let contandoNovaSequencia3Cores = false; // Flag para saber se estamos contando uma nova sequência

// Função processarEstrategia3Cores completa atualizada
async function processarEstrategia3Cores(res) {
  // Primeira rodada após detectar padrão para trio de cores (G0)
  if (alertaAtivoCor3 && corAlvo3 && rodadaG0Cor3 === null) {
    console.log(
      `Alerta ativo para trio de cor, primeira tentativa (G0). Cor alvo: ${corAlvo3}`
    );

    if (res.numero === 0) {
      totalZeros++; // Contador geral de zeros
      zerosCor3++; // Contador específico de zeros para estratégia de 3 cores
      vitoriaConsecutivaCor3++; // Incrementa contagem de vitórias consecutivas

      // Atualiza o contador de maior sequência de vitórias
      if (vitoriaConsecutivaCor3 > maiorVitoriaConsecutivaCor3) {
        maiorVitoriaConsecutivaCor3 = vitoriaConsecutivaCor3;
      }

      await enviarTelegram(
        `🟢 3 CORES (TRIO): Número 0 caiu! ✅ Green para estratégia de trio de cor [${vitoriaConsecutivaCor3} VITÓRIA${
          vitoriaConsecutivaCor3 > 1 ? "S" : ""
        } CONSECUTIVA${
          vitoriaConsecutivaCor3 > 1 ? "S" : ""
        }]\n📊 3 Cores: Greens: ${totalGreensCor3} | Reds: ${totalRedsCor3} | Zeros: ${zerosCor3}`,
        "trioCor"
      );

      // Registrar a vitória e iniciar nova contagem
      registrarVitoria3Cores(res);

      // Resetar alerta
      resetarAlerta3Cores();
    } else if (res.cor === corAlvo3) {
      vitoriaConsecutivaCor3++; // Incrementa contagem de vitórias consecutivas

      // Atualiza o contador de maior sequência de vitórias
      if (vitoriaConsecutivaCor3 > maiorVitoriaConsecutivaCor3) {
        maiorVitoriaConsecutivaCor3 = vitoriaConsecutivaCor3;
      }

      await enviarTelegram(
        `🟢 3 CORES (TRIO): ${capitalize(corAlvo3)} [${
          res.numero
        }], ✅ Green para estratégia de trio de cor! [${vitoriaConsecutivaCor3} VITÓRIA${
          vitoriaConsecutivaCor3 > 1 ? "S" : ""
        } CONSECUTIVA${
          vitoriaConsecutivaCor3 > 1 ? "S" : ""
        }]\n📊 3 Cores: Greens: ${totalGreensCor3} | Reds: ${totalRedsCor3} | Zeros: ${zerosCor3}`,
        "trioCor"
      );

      // Registrar a vitória e iniciar nova contagem
      registrarVitoria3Cores(res);

      // Resetar alerta
      resetarAlerta3Cores();
    } else {
      await enviarTelegram(
        `🔄 3 CORES (TRIO): ${capitalize(res.cor)} [${
          res.numero
        }], vamos para o G1 na estratégia de trio de cor...`,
        "trioCor"
      );
      rodadaG0Cor3 = res;
      console.log(
        "Primeira tentativa falhou, indo para G1 na estratégia de trio de cor"
      );
    }
  }
  // Segunda rodada após detectar padrão para trio de cores (G1)
  else if (alertaAtivoCor3 && corAlvo3 && rodadaG0Cor3) {
    console.log("Processando G1 para estratégia de trio de cor");

    if (res.numero === 0) {
      totalZeros++; // Contador geral de zeros
      zerosCor3++; // Contador específico de zeros para estratégia de 3 cores
      vitoriaConsecutivaCor3++; // Incrementa contagem de vitórias consecutivas

      // Atualiza o contador de maior sequência de vitórias
      if (vitoriaConsecutivaCor3 > maiorVitoriaConsecutivaCor3) {
        maiorVitoriaConsecutivaCor3 = vitoriaConsecutivaCor3;
      }

      await enviarTelegram(
        `🟢 3 CORES (TRIO): Número 0 caiu! ✅ Green no G1 para estratégia de trio de cor [${vitoriaConsecutivaCor3} VITÓRIA${
          vitoriaConsecutivaCor3 > 1 ? "S" : ""
        } CONSECUTIVA${
          vitoriaConsecutivaCor3 > 1 ? "S" : ""
        }]\n📊 3 Cores: Greens: ${totalGreensCor3} | Reds: ${totalRedsCor3} | Zeros: ${zerosCor3}`,
        "trioCor"
      );

      // Registrar a vitória e iniciar nova contagem
      registrarVitoria3Cores(res);

      // Resetar alerta
      resetarAlerta3Cores();
    } else if (res.cor === corAlvo3) {
      vitoriaConsecutivaCor3++; // Incrementa contagem de vitórias consecutivas

      // Atualiza o contador de maior sequência de vitórias
      if (vitoriaConsecutivaCor3 > maiorVitoriaConsecutivaCor3) {
        maiorVitoriaConsecutivaCor3 = vitoriaConsecutivaCor3;
      }

      await enviarTelegram(
        `🟢 3 CORES (TRIO): ${capitalize(corAlvo3)} [${
          res.numero
        }], ✅ Green no G1 para estratégia de trio de cor! [${vitoriaConsecutivaCor3} VITÓRIA${
          vitoriaConsecutivaCor3 > 1 ? "S" : ""
        } CONSECUTIVA${
          vitoriaConsecutivaCor3 > 1 ? "S" : ""
        }]\n📊 3 Cores: Greens: ${totalGreensCor3} | Reds: ${totalRedsCor3} | Zeros: ${zerosCor3}`,
        "trioCor"
      );

      // Registrar a vitória e iniciar nova contagem
      registrarVitoria3Cores(res);

      // Resetar alerta
      resetarAlerta3Cores();
    } else {
      vitoriaConsecutivaCor3 = 0; // Reseta contagem de vitórias consecutivas

      await enviarTelegram(
        `❌ 3 CORES (TRIO): ${capitalize(res.cor)} [${
          res.numero
        }], ❌ Red/perca na estratégia de trio de cor\n📊 3 Cores: Greens: ${totalGreensCor3} | Reds: ${totalRedsCor3} | Zeros: ${zerosCor3}`,
        "trioCor"
      );

      // Registrar a derrota e iniciar nova contagem
      registrarDerrota3Cores(res);

      // Resetar alerta
      resetarAlerta3Cores();
    }
  }
  // Caso contrário, estamos analisando sequências ou começando uma nova contagem
  else {
    // Se estamos começando a contar uma nova sequência após uma vitória/derrota
    if (contandoNovaSequencia3Cores) {
      console.log(
        `Adicionando ${res.numero} (${res.cor}) à nova sequência de 3 cores`
      );
      sequenciaAtual3Cores.push({
        numero: res.numero,
        cor: res.cor,
      });

      // Se já temos 3 números na nova sequência, analisar
      if (sequenciaAtual3Cores.length === 3) {
        console.log("Nova sequência de 3 cores completa, analisando...");

        const [primeiro, segundo, terceiro] = sequenciaAtual3Cores;
        console.log(`Nova sequência completa: 
        ${primeiro.numero} (${primeiro.cor}), 
        ${segundo.numero} (${segundo.cor}), 
        ${terceiro.numero} (${terceiro.cor})`);

        // Verificar se todos têm a mesma cor e não são verdes
        if (
          primeiro.cor === segundo.cor &&
          segundo.cor === terceiro.cor &&
          primeiro.cor !== "verde"
        ) {
          alertaAtivoCor3 = true;
          corAlvo3 = primeiro.cor;
          await enviarTelegram(
            `⚠️ ESTRATÉGIA DE 3 CORES (TRIO): 3 ${corAlvo3}s seguidos...\nAguardando próxima rodada para estratégia de trio de cores...`,
            "trioCor"
          );
          console.log(`Alerta ativado para trio de cor! Cor alvo: ${corAlvo3}`);

          // Resetar a contagem de nova sequência, pois já ativamos o alerta
          sequenciaAtual3Cores = [];
          contandoNovaSequencia3Cores = false;
        } else {
          // Se não formou uma sequência de mesma cor, resetar para começar uma nova
          console.log(
            "Sequência de 3 cores não formou um padrão válido, resetando..."
          );
          sequenciaAtual3Cores = [];
          contandoNovaSequencia3Cores = false;
        }
      }
    }
    // Análise normal do histórico se não estamos contando uma nova sequência
    else if (
      !alertaAtivoCor3 && // Mantemos apenas esta verificação
      historico.length >= 3
    ) {
      // Importante: analisar da direita para a esquerda
      // No contexto do histórico, isso significa pegar os índices 2, 1, 0
      const sequencia = [historico[2], historico[1], historico[0]];
      const [terceiro, segundo, primeiro] = sequencia;

      console.log(`Analisando sequência de 3 cores da direita para a esquerda: 
      ${terceiro.numero} (${terceiro.cor}), 
      ${segundo.numero} (${segundo.cor}), 
      ${primeiro.numero} (${primeiro.cor})`);

      // Usar nossa função para decidir se ignoramos ou não
      const deveIgnorar = deveIgnorarSequencia(
        sequencia.map((item) => item), // passar uma cópia da sequência
        ultimaVitoriaCor3,
        2 * 60 * 1000 // 2 minutos, tempo mais curto para permitir novas sequências
      );

      if (deveIgnorar) {
        console.log(
          `Ignorando verificação de 3 cores, pois o número vencedor (${ultimaVitoriaCor3.numero}) ainda está na sequência analisada e é muito recente.`
        );
      } else {
        // Verifica se todas as 3 cores são iguais e não são verdes
        if (
          terceiro.cor === segundo.cor &&
          segundo.cor === primeiro.cor &&
          terceiro.cor !== "verde"
        ) {
          alertaAtivoCor3 = true;
          corAlvo3 = terceiro.cor;
          await enviarTelegram(
            `⚠️ ESTRATÉGIA DE 3 CORES (TRIO): 3 ${corAlvo3}s seguidos...\nAguardando próxima rodada para estratégia de trio de cores...`,
            "trioCor"
          );
          console.log(`Alerta ativado para trio de cor! Cor alvo: ${corAlvo3}`);
        }
      }
    }
  }
}

function registrarVitoria3Cores(res) {
  totalGreensCor3++;
  vitoriaConsecutivaCor3++; // Incrementa contagem de vitórias consecutivas

  // Atualiza o contador de maior sequência de vitórias
  if (vitoriaConsecutivaCor3 > maiorVitoriaConsecutivaCor3) {
    maiorVitoriaConsecutivaCor3 = vitoriaConsecutivaCor3;
  }

  // Registrar a vitória
  ultimaVitoriaCor3 = {
    numero: res.numero,
    cor: res.cor,
    dataHora: new Date(),
  };

  // Atualizar também a última vitória geral para referência
  ultimaVitoria = {
    numero: res.numero,
    cor: res.cor,
    dataHora: new Date(),
    estrategia: "3cores",
  };

  // Iniciar uma nova contagem
  sequenciaAtual3Cores = [];
  contandoNovaSequencia3Cores = true;
  console.log(
    "Iniciando nova contagem para estratégia de 3 cores após vitória"
  );
}

function registrarDerrota3Cores(res) {
  totalRedsCor3++;
  vitoriaConsecutivaCor3 = 0; // Reseta contagem de vitórias consecutivas

  // Registrar a derrota
  ultimaVitoriaCor3 = {
    numero: res.numero,
    cor: res.cor,
    dataHora: new Date(),
  };

  // Atualizar também a última vitória geral para referência
  ultimaVitoria = {
    numero: res.numero,
    cor: res.cor,
    dataHora: new Date(),
    estrategia: "3cores",
  };

  // Iniciar uma nova contagem
  sequenciaAtual3Cores = [];
  contandoNovaSequencia3Cores = true;
  console.log(
    "Iniciando nova contagem para estratégia de 3 cores após derrota"
  );
}

// Função para resetar alerta de 3 cores
function resetarAlerta3Cores() {
  console.log("Resetando alerta de 3 cores");
  alertaAtivoCor3 = false;
  corAlvo3 = null;
  rodadaG0Cor3 = null;

  // Não modificamos sequenciaAtual3Cores ou contandoNovaSequencia3Cores aqui
  // pois queremos que a nova contagem continue

  // Definir um tempo de expiração para permitir detecção de novas sequências
  // mesmo se houver números comuns entre a sequência antiga e a nova
  if (ultimaVitoriaCor3 && ultimaVitoriaCor3.numero !== null) {
    // Define um tempo de expiração para permitir novas sequências em breve
    ultimaVitoriaCor3.dataHora = new Date(new Date() - 4 * 60 * 1000); // Define como 4 minutos atrás
    console.log(
      `Definindo tempo de expiração para última vitória de 3 cores (${ultimaVitoriaCor3.numero})`
    );
  }

  console.log("Estratégia de 3 cores resetada após vitória/derrota");
}

// Nova função para determinar se uma sequência deve ser ignorada
function deveIgnorarSequencia(
  numerosSequencia,
  ultimaVitoria,
  tempoLimiteMs = 5 * 60 * 1000
) {
  if (!ultimaVitoria || ultimaVitoria.numero === null) {
    return false; // Não há vitória anterior para considerar
  }

  // Verifica se o número da última vitória está na sequência E se foi recente
  const vitoriaNaSequencia = numerosSequencia.some(
    (item) => item.numero === ultimaVitoria.numero
  );
  const vitoriaMuitoRecente =
    new Date() - ultimaVitoria.dataHora < tempoLimiteMs;

  return vitoriaNaSequencia && vitoriaMuitoRecente;
}

// Variáveis globais para controlar a sequência atual de 5 cores
let sequenciaAtual5Cores = []; // Armazena os números da sequência atual de 5 cores
let contandoNovaSequencia5Cores = false; // Flag para saber se estamos contando uma nova sequência

// Estratégia baseada em 5 cores iguais seguidas - Atualizada
async function processarEstrategia5Cores(res) {
  // Primeira rodada após detectar padrão para 5 cores (G0)
  if (alertaAtivoCor5 && corAlvo5 && rodadaG0Cor5 === null) {
    console.log(
      `Alerta ativo para 5 cores, primeira tentativa (G0). Cor alvo: ${corAlvo5}`
    );

    if (res.numero === 0) {
      totalZeros++; // Contador geral de zeros
      zerosCor5++; // Contador específico de zeros para estratégia de 5 cores
      totalGreensCor5++;
      vitoriaConsecutivaCor5++; // Incrementa contagem de vitórias consecutivas

      // Atualiza o contador de maior sequência de vitórias
      if (vitoriaConsecutivaCor5 > maiorVitoriaConsecutivaCor5) {
        maiorVitoriaConsecutivaCor5 = vitoriaConsecutivaCor5;
      }

      await enviarTelegram(
        `🟢 5 CORES: Número 0 caiu! ✅ Green para estratégia de 5 cores [${vitoriaConsecutivaCor5} VITÓRIA${
          vitoriaConsecutivaCor5 > 1 ? "S" : ""
        } CONSECUTIVA${
          vitoriaConsecutivaCor5 > 1 ? "S" : ""
        }]\n📊 5 Cores: Greens: ${totalGreensCor5} | Reds: ${totalRedsCor5} | Zeros: ${zerosCor5}`,
        "cor"
      );

      // Registrar a vitória e iniciar nova contagem
      registrarVitoria5Cores(res);

      // Resetar alerta
      resetarAlerta5Cores();
    } else if (res.cor === corAlvo5) {
      totalGreensCor5++;
      vitoriaConsecutivaCor5++; // Incrementa contagem de vitórias consecutivas

      // Atualiza o contador de maior sequência de vitórias
      if (vitoriaConsecutivaCor5 > maiorVitoriaConsecutivaCor5) {
        maiorVitoriaConsecutivaCor5 = vitoriaConsecutivaCor5;
      }

      await enviarTelegram(
        `🟢 5 CORES: ${capitalize(corAlvo5)} [${
          res.numero
        }], ✅ Green para estratégia de 5 cores! [${vitoriaConsecutivaCor5} VITÓRIA${
          vitoriaConsecutivaCor5 > 1 ? "S" : ""
        } CONSECUTIVA${
          vitoriaConsecutivaCor5 > 1 ? "S" : ""
        }]\n📊 5 Cores: Greens: ${totalGreensCor5} | Reds: ${totalRedsCor5} | Zeros: ${zerosCor5}`,
        "cor"
      );

      // Registrar a vitória e iniciar nova contagem
      registrarVitoria5Cores(res);

      // Resetar alerta
      resetarAlerta5Cores();
    } else {
      await enviarTelegram(
        `🔄 5 CORES: ${capitalize(res.cor)} [${
          res.numero
        }], vamos para o G1 na estratégia de 5 cores...`,
        "cor"
      );
      rodadaG0Cor5 = res;
      console.log(
        "Primeira tentativa falhou, indo para G1 na estratégia de 5 cores"
      );
    }
  }
  // Segunda rodada após detectar padrão para 5 cores (G1)
  else if (alertaAtivoCor5 && corAlvo5 && rodadaG0Cor5) {
    console.log("Processando G1 para estratégia de 5 cores");

    if (res.numero === 0) {
      totalZeros++; // Contador geral de zeros
      zerosCor5++; // Contador específico de zeros para estratégia de 5 cores
      totalGreensCor5++;
      vitoriaConsecutivaCor5++; // Incrementa contagem de vitórias consecutivas

      // Atualiza o contador de maior sequência de vitórias
      if (vitoriaConsecutivaCor5 > maiorVitoriaConsecutivaCor5) {
        maiorVitoriaConsecutivaCor5 = vitoriaConsecutivaCor5;
      }

      await enviarTelegram(
        `🟢 5 CORES: Número 0 caiu! ✅ Green no G1 para estratégia de 5 cores [${vitoriaConsecutivaCor5} VITÓRIA${
          vitoriaConsecutivaCor5 > 1 ? "S" : ""
        } CONSECUTIVA${
          vitoriaConsecutivaCor5 > 1 ? "S" : ""
        }]\n📊 5 Cores: Greens: ${totalGreensCor5} | Reds: ${totalRedsCor5} | Zeros: ${zerosCor5}`,
        "cor"
      );

      // Registrar a vitória e iniciar nova contagem
      registrarVitoria5Cores(res);

      // Resetar alerta
      resetarAlerta5Cores();
    } else if (res.cor === corAlvo5) {
      totalGreensCor5++;
      vitoriaConsecutivaCor5++; // Incrementa contagem de vitórias consecutivas

      // Atualiza o contador de maior sequência de vitórias
      if (vitoriaConsecutivaCor5 > maiorVitoriaConsecutivaCor5) {
        maiorVitoriaConsecutivaCor5 = vitoriaConsecutivaCor5;
      }

      await enviarTelegram(
        `🟢 5 CORES: ${capitalize(corAlvo5)} [${
          res.numero
        }], ✅ Green no G1 para estratégia de 5 cores! [${vitoriaConsecutivaCor5} VITÓRIA${
          vitoriaConsecutivaCor5 > 1 ? "S" : ""
        } CONSECUTIVA${
          vitoriaConsecutivaCor5 > 1 ? "S" : ""
        }]\n📊 5 Cores: Greens: ${totalGreensCor5} | Reds: ${totalRedsCor5} | Zeros: ${zerosCor5}`,
        "cor"
      );

      // Registrar a vitória e iniciar nova contagem
      registrarVitoria5Cores(res);

      // Resetar alerta
      resetarAlerta5Cores();
    } else {
      totalRedsCor5++;
      vitoriaConsecutivaCor5 = 0; // Reseta contagem de vitórias consecutivas

      await enviarTelegram(
        `❌ 5 CORES: ${capitalize(res.cor)} [${
          res.numero
        }], ❌ Red/perca na estratégia de 5 cores\n📊 5 Cores: Greens: ${totalGreensCor5} | Reds: ${totalRedsCor5} | Zeros: ${zerosCor5}`,
        "cor"
      );

      // Registrar a derrota e iniciar nova contagem
      registrarDerrota5Cores(res);

      // Resetar alerta
      resetarAlerta5Cores();
    }
  }
  // Caso contrário, estamos analisando sequências ou começando uma nova contagem
  else {
    // Se estamos começando a contar uma nova sequência após uma vitória/derrota
    if (contandoNovaSequencia5Cores) {
      console.log(
        `Adicionando ${res.numero} (${res.cor}) à nova sequência de 5 cores`
      );
      sequenciaAtual5Cores.push({
        numero: res.numero,
        cor: res.cor,
      });

      // Se já temos 5 números na nova sequência, analisar
      if (sequenciaAtual5Cores.length === 5) {
        console.log("Nova sequência de 5 cores completa, analisando...");

        const [primeiro, segundo, terceiro, quarto, quinto] =
          sequenciaAtual5Cores;
        console.log(`Nova sequência completa: 
        ${primeiro.numero} (${primeiro.cor}), 
        ${segundo.numero} (${segundo.cor}), 
        ${terceiro.numero} (${terceiro.cor}),
        ${quarto.numero} (${quarto.cor}),
        ${quinto.numero} (${quinto.cor})`);

        // Verificar se todos têm a mesma cor e não são verdes
        if (
          primeiro.cor === segundo.cor &&
          segundo.cor === terceiro.cor &&
          terceiro.cor === quarto.cor &&
          quarto.cor === quinto.cor &&
          primeiro.cor !== "verde"
        ) {
          alertaAtivoCor5 = true;
          corAlvo5 = primeiro.cor;
          await enviarTelegram(
            `⚠️ ESTRATÉGIA DE 5 CORES: 5 ${corAlvo5}s seguidos...\nAguardando próxima rodada para estratégia de 5 cores...`,
            "cor"
          );
          console.log(`Alerta ativado para 5 cores! Cor alvo: ${corAlvo5}`);

          // Resetar a contagem de nova sequência, pois já ativamos o alerta
          sequenciaAtual5Cores = [];
          contandoNovaSequencia5Cores = false;
        } else {
          // Se não formou uma sequência de mesma cor, resetar para começar uma nova
          console.log(
            "Sequência de 5 cores não formou um padrão válido, resetando..."
          );
          sequenciaAtual5Cores = [];
          contandoNovaSequencia5Cores = false;
        }
      }
    }
    // Análise normal do histórico se não estamos contando uma nova sequência
    else if (
      !alertaAtivoCor5 && // Mantemos apenas esta verificação
      historico.length >= 5
    ) {
      // Importante: analisar da direita para a esquerda
      // No contexto do nosso histórico, isso significa pegar os índices 4, 3, 2, 1, 0
      const sequencia = [
        historico[4],
        historico[3],
        historico[2],
        historico[1],
        historico[0],
      ];
      const [quinto, quarto, terceiro, segundo, primeiro] = sequencia;

      console.log(`Analisando sequência de 5 cores da direita para a esquerda: 
      ${quinto.numero} (${quinto.cor}), 
      ${quarto.numero} (${quarto.cor}), 
      ${terceiro.numero} (${terceiro.cor}), 
      ${segundo.numero} (${segundo.cor}), 
      ${primeiro.numero} (${primeiro.cor})`);

      // Usar nossa função para decidir se ignoramos ou não
      const deveIgnorar = deveIgnorarSequencia(
        sequencia.map((item) => item), // passar uma cópia da sequência
        ultimaVitoriaCor5,
        2 * 60 * 1000 // 2 minutos, tempo mais curto para permitir novas sequências
      );

      if (deveIgnorar) {
        console.log(
          `Ignorando verificação de 5 cores, pois o número vencedor (${ultimaVitoriaCor5.numero}) ainda está na sequência analisada e é muito recente.`
        );
      } else {
        // Verificamos se todas as 5 cores são iguais e não são verdes
        if (
          quinto.cor === quarto.cor &&
          quarto.cor === terceiro.cor &&
          terceiro.cor === segundo.cor &&
          segundo.cor === primeiro.cor &&
          quinto.cor !== "verde"
        ) {
          alertaAtivoCor5 = true;
          corAlvo5 = quinto.cor;
          await enviarTelegram(
            `⚠️ ESTRATÉGIA DE 5 CORES: 5 ${corAlvo5}s seguidos...\nAguardando próxima rodada para estratégia de 5 cores...`,
            "cor"
          );
          console.log(`Alerta ativado para 5 cores! Cor alvo: ${corAlvo5}`);
        }
      }
    }
  }
}

// Função para registrar vitória na estratégia de 5 cores
function registrarVitoria5Cores(res) {
  totalGreensCor5++;
  vitoriaConsecutivaCor5++; // Incrementa contagem de vitórias consecutivas

  // Atualiza o contador de maior sequência de vitórias
  if (vitoriaConsecutivaCor5 > maiorVitoriaConsecutivaCor5) {
    maiorVitoriaConsecutivaCor5 = vitoriaConsecutivaCor5;
  }

  // Registrar a vitória
  ultimaVitoriaCor5 = {
    numero: res.numero,
    cor: res.cor,
    dataHora: new Date(),
  };

  // Atualizar também a última vitória geral para referência
  ultimaVitoria = {
    numero: res.numero,
    cor: res.cor,
    dataHora: new Date(),
    estrategia: "5cores",
  };

  // Iniciar uma nova contagem
  sequenciaAtual5Cores = [];
  contandoNovaSequencia5Cores = true;
  console.log(
    "Iniciando nova contagem para estratégia de 5 cores após vitória"
  );
}

function registrarDerrota5Cores(res) {
  totalRedsCor5++;
  vitoriaConsecutivaCor5 = 0; // Reseta contagem de vitórias consecutivas

  // Registrar a derrota
  ultimaVitoriaCor5 = {
    numero: res.numero,
    cor: res.cor,
    dataHora: new Date(),
  };

  // Atualizar também a última vitória geral para referência
  ultimaVitoria = {
    numero: res.numero,
    cor: res.cor,
    dataHora: new Date(),
    estrategia: "5cores",
  };

  // Iniciar uma nova contagem
  sequenciaAtual5Cores = [];
  contandoNovaSequencia5Cores = true;
  console.log(
    "Iniciando nova contagem para estratégia de 5 cores após derrota"
  );
}

// Função para resetar alerta de 5 cores - atualizada
function resetarAlerta5Cores() {
  console.log("Resetando alerta de 5 cores");
  alertaAtivoCor5 = false;
  corAlvo5 = null;
  rodadaG0Cor5 = null;

  // Não modificamos sequenciaAtual5Cores ou contandoNovaSequencia5Cores aqui
  // pois queremos que a nova contagem continue

  // Definir um tempo de expiração para permitir detecção de novas sequências
  // mesmo se houver números comuns entre a sequência antiga e a nova
  if (ultimaVitoriaCor5 && ultimaVitoriaCor5.numero !== null) {
    // Define um tempo de expiração para permitir novas sequências em breve
    ultimaVitoriaCor5.dataHora = new Date(new Date() - 4 * 60 * 1000); // Define como 4 minutos atrás
    console.log(
      `Definindo tempo de expiração para última vitória de 5 cores (${ultimaVitoriaCor5.numero})`
    );
  }

  console.log("Estratégia de 5 cores resetada após vitória/derrota");
}

// Estratégia baseada em colunas (8 números em 2 colunas) - Atualizada
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

  // Verifica padrão de colunas - Removida a dependência de outras estratégias
  if (
    !alertaAtivoColuna && // Mantemos apenas esta verificação
    ultimosOitoNumeros.length === 8
  ) {
    // Verificar se temos uma última vitória recente na estratégia de colunas
    let deveIgnorar = false;

    if (
      ultimaVitoriaCol &&
      ultimaVitoriaCol.numero !== null &&
      new Date() - ultimaVitoriaCol.dataHora < 5 * 60 * 1000
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
        alertaAtivoColuna = true;
        colunaAlvo = colunasDistintas; // colunaAlvo é um array com as colunas presentes
        const colunasPresentes = colunasDistintas.join(" e ");

        await enviarTelegram(
          `⚠️ ESTRATÉGIA DE COLUNAS: Os últimos 8 números caíram apenas nas colunas ${colunasPresentes}.
🎯 Entrada sugerida nas colunas ${colunasPresentes} na próxima rodada!`,
          "coluna"
        );

        console.log(
          `Alerta de colunas ativado! Colunas alvo: ${colunasPresentes}`
        );
      }
    }
  }

  // Primeira rodada após detectar padrão para colunas (G0) - Removida a dependência de outras estratégias
  else if (alertaAtivoColuna && colunaAlvo && rodadaG0Coluna === null) {
    console.log(
      `Alerta ativo para coluna, primeira tentativa (G0). Colunas alvo: ${colunaAlvo.join(
        " e "
      )}`
    );

    if (res.numero === 0) {
      totalZeros++; // Contador geral de zeros
      zerosColuna++; // Contador específico de zeros para estratégia de colunas
      totalGreensColuna++;
      vitoriaConsecutivaColuna++; // Incrementa contagem de vitórias consecutivas

      // Atualiza o contador de maior sequência de vitórias
      if (vitoriaConsecutivaColuna > maiorVitoriaConsecutivaColuna) {
        maiorVitoriaConsecutivaColuna = vitoriaConsecutivaColuna;
      }

      await enviarTelegram(
        `🟢 COLUNAS: Número 0 caiu! ✅ Green para estratégia de coluna [${vitoriaConsecutivaColuna} VITÓRIA${
          vitoriaConsecutivaColuna > 1 ? "S" : ""
        } CONSECUTIVA${
          vitoriaConsecutivaColuna > 1 ? "S" : ""
        }]\n📊 Colunas: Greens: ${totalGreensColuna} | Reds: ${totalRedsColuna} | Zeros: ${zerosColuna}`,
        "coluna"
      );

      // Marcar este número como vencedor para ESTA estratégia
      ultimaVitoriaCol = {
        numero: res.numero,
        dataHora: new Date(),
      };

      // Também atualizamos a última vitória geral para referência
      ultimaVitoria = {
        numero: res.numero,
        cor: res.cor,
        estrategia: "coluna",
        dataHora: new Date(),
      };

      console.log(
        `Marcando ${res.numero} como última vitória para estratégia de coluna.`
      );

      resetarAlertaColunas();
    } else if (colunaAlvo.includes(getColuna(res.numero))) {
      totalGreensColuna++;
      vitoriaConsecutivaColuna++; // Incrementa contagem de vitórias consecutivas

      // Atualiza o contador de maior sequência de vitórias
      if (vitoriaConsecutivaColuna > maiorVitoriaConsecutivaColuna) {
        maiorVitoriaConsecutivaColuna = vitoriaConsecutivaColuna;
      }

      await enviarTelegram(
        `🟢 COLUNAS:  [${res.numero}] coluna ${getColuna(
          res.numero
        )}! ✅ Green para estratégia de coluna [${vitoriaConsecutivaColuna} VITÓRIA${
          vitoriaConsecutivaColuna > 1 ? "S" : ""
        } CONSECUTIVA${
          vitoriaConsecutivaColuna > 1 ? "S" : ""
        }]\n📊 Colunas: Greens: ${totalGreensColuna} | Reds: ${totalRedsColuna} | Zeros: ${zerosColuna}`,
        "coluna"
      );

      // Marcar este número como vencedor para ESTA estratégia
      ultimaVitoriaCol = {
        numero: res.numero,
        dataHora: new Date(),
      };

      // Também atualizamos a última vitória geral para referência
      ultimaVitoria = {
        numero: res.numero,
        cor: res.cor,
        estrategia: "coluna",
        dataHora: new Date(),
      };

      console.log(
        `Marcando ${res.numero} como última vitória para estratégia de coluna.`
      );

      resetarAlertaColunas();
    } else {
      await enviarTelegram(
        `🔄 COLUNAS:  [${res.numero}]  coluna ${getColuna(
          res.numero
        )}, vamos para o G1 na estratégia de coluna...`,
        "coluna"
      );
      rodadaG0Coluna = res;
      console.log(
        "Primeira tentativa falhou, indo para G1 na estratégia de coluna"
      );
    }
  }
  // Segunda rodada após detectar padrão para colunas (G1) - Removida a dependência de outras estratégias
  else if (alertaAtivoColuna && colunaAlvo && rodadaG0Coluna) {
    console.log("Processando G1 para estratégia de coluna");

    if (res.numero === 0) {
      totalZeros++; // Contador geral de zeros
      zerosColuna++; // Contador específico de zeros para estratégia de colunas
      totalGreensColuna++;
      vitoriaConsecutivaColuna++; // Incrementa contagem de vitórias consecutivas

      // Atualiza o contador de maior sequência de vitórias
      if (vitoriaConsecutivaColuna > maiorVitoriaConsecutivaColuna) {
        maiorVitoriaConsecutivaColuna = vitoriaConsecutivaColuna;
      }

      await enviarTelegram(
        `🟢 COLUNAS: Número 0 caiu! ✅ Green no G1 para estratégia de coluna [${vitoriaConsecutivaColuna} VITÓRIA${
          vitoriaConsecutivaColuna > 1 ? "S" : ""
        } CONSECUTIVA${
          vitoriaConsecutivaColuna > 1 ? "S" : ""
        }]\n📊 Colunas: Greens: ${totalGreensColuna} | Reds: ${totalRedsColuna} | Zeros: ${zerosColuna}`,
        "coluna"
      );

      // Marcar este número como vencedor para ESTA estratégia
      ultimaVitoriaCol = {
        numero: res.numero,
        dataHora: new Date(),
      };

      // Também atualizamos a última vitória geral para referência
      ultimaVitoria = {
        numero: res.numero,
        cor: res.cor,
        estrategia: "coluna",
        dataHora: new Date(),
      };

      console.log(
        `Marcando ${res.numero} como última vitória para estratégia de coluna.`
      );

      resetarAlertaColunas();
    } else if (colunaAlvo.includes(getColuna(res.numero))) {
      totalGreensColuna++;
      vitoriaConsecutivaColuna++; // Incrementa contagem de vitórias consecutivas

      // Atualiza o contador de maior sequência de vitórias
      if (vitoriaConsecutivaColuna > maiorVitoriaConsecutivaColuna) {
        maiorVitoriaConsecutivaColuna = vitoriaConsecutivaColuna;
      }

      await enviarTelegram(
        `🟢 COLUNAS:  [${res.numero}] coluna ${getColuna(
          res.numero
        )}! ✅ Green no G1 para estratégia de coluna [${vitoriaConsecutivaColuna} VITÓRIA${
          vitoriaConsecutivaColuna > 1 ? "S" : ""
        } CONSECUTIVA${
          vitoriaConsecutivaColuna > 1 ? "S" : ""
        }]\n📊 Colunas: Greens: ${totalGreensColuna} | Reds: ${totalRedsColuna} | Zeros: ${zerosColuna}`,
        "coluna"
      );

      // Marcar este número como vencedor para ESTA estratégia
      ultimaVitoriaCol = {
        numero: res.numero,
        dataHora: new Date(),
      };

      // Também atualizamos a última vitória geral para referência
      ultimaVitoria = {
        numero: res.numero,
        cor: res.cor,
        estrategia: "coluna",
        dataHora: new Date(),
      };

      console.log(
        `Marcando ${res.numero} como última vitória para estratégia de coluna.`
      );

      resetarAlertaColunas();
    } else {
      totalRedsColuna++;
      vitoriaConsecutivaColuna = 0; // Reseta contagem de vitórias consecutivas

      await enviarTelegram(
        `❌ COLUNAS:  [${res.numero}]  coluna ${getColuna(
          res.numero
        )}. ❌ Red/perca na estratégia de coluna\n📊 Colunas: Greens: ${totalGreensColuna} | Reds: ${totalRedsColuna} | Zeros: ${zerosColuna}`,
        "coluna"
      );

      // Marcar este número para saber que a última derrota foi na estratégia de colunas
      ultimaVitoriaCol = {
        numero: res.numero,
        dataHora: new Date(),
      };

      // Também atualizamos a última vitória geral para referência
      ultimaVitoria = {
        numero: res.numero,
        cor: res.cor,
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
    alertaAtivoColuna = false;
    colunaAlvo = null;
    rodadaG0Coluna = null;

    // Limpar o histórico de últimos oito números para forçar uma nova contagem
    ultimosOitoNumeros = [];

    console.log(
      "Estratégia de colunas resetada após vitória/derrota. Histórico de 8 números reiniciado."
    );
  }
}

// Estratégia baseada em dúzias (8 números em 2 dúzias) - Atualizada
async function processarEstrategiaDuzias(res) {
  // Verificação de padrão de dúzias - Removida a dependência de outras estratégias
  if (
    !alertaAtivoDuzia && // Mantemos apenas esta verificação
    ultimosOitoNumeros.length === 8
  ) {
    // Verificar se temos uma última vitória recente na estratégia de dúzias
    let deveIgnorar = false;

    if (
      ultimaVitoriaDz &&
      ultimaVitoriaDz.numero !== null &&
      new Date() - ultimaVitoriaDz.dataHora < 5 * 60 * 1000
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
        alertaAtivoDuzia = true;
        duziaAlvo = duziasDistintas; // Agora duziaAlvo é um array com as dúzias presentes
        const duziasPresentes = duziasDistintas.join(" e ");

        await enviarTelegram(
          `⚠️ ESTRATÉGIA DE DÚZIAS: Os últimos 8 números caíram apenas nas dúzias ${duziasPresentes}.
🎯 Entrada sugerida nas dúzias ${duziasPresentes} na próxima rodada!`,
          "duzia"
        );

        console.log(
          `Alerta de dúzias ativado! Dúzias alvo: ${duziasPresentes}`
        );
      }
    }
  }

  // Primeira rodada após detectar padrão para dúzias (G0) - Removida a dependência de outras estratégias
  else if (alertaAtivoDuzia && duziaAlvo && rodadaG0Duzia === null) {
    console.log(
      `Alerta ativo para dúzia, primeira tentativa (G0). Dúzias alvo: ${duziaAlvo.join(
        " e "
      )}`
    );

    if (res.numero === 0) {
      totalZeros++; // Contador geral de zeros
      zerosDuzia++; // Contador específico de zeros para estratégia de dúzias
      totalGreensDuzia++;
      vitoriaConsecutivaDuzia++; // Incrementa contagem de vitórias consecutivas

      // Atualiza o contador de maior sequência de vitórias
      if (vitoriaConsecutivaDuzia > maiorVitoriaConsecutivaDuzia) {
        maiorVitoriaConsecutivaDuzia = vitoriaConsecutivaDuzia;
      }

      await enviarTelegram(
        `🟢 DÚZIAS: Número 0 caiu! ✅ Green para estratégia de dúzia [${vitoriaConsecutivaDuzia} VITÓRIA${
          vitoriaConsecutivaDuzia > 1 ? "S" : ""
        } CONSECUTIVA${
          vitoriaConsecutivaDuzia > 1 ? "S" : ""
        }]\n📊 Dúzias: Greens: ${totalGreensDuzia} | Reds: ${totalRedsDuzia} | Zeros: ${zerosDuzia}`,
        "duzia"
      );

      // Marcar este número como vencedor para ESTA estratégia
      ultimaVitoriaDz = {
        numero: res.numero,
        dataHora: new Date(),
      };

      // Também atualizamos a última vitória geral para referência
      ultimaVitoria = {
        numero: res.numero,
        cor: res.cor,
        estrategia: "duzia",
        dataHora: new Date(),
      };

      console.log(
        `Marcando ${res.numero} como última vitória para estratégia de dúzia.`
      );

      resetarAlertaDuzias();
    } else if (duziaAlvo.includes(getDuzia(res.numero))) {
      totalGreensDuzia++;
      vitoriaConsecutivaDuzia++; // Incrementa contagem de vitórias consecutivas

      // Atualiza o contador de maior sequência de vitórias
      if (vitoriaConsecutivaDuzia > maiorVitoriaConsecutivaDuzia) {
        maiorVitoriaConsecutivaDuzia = vitoriaConsecutivaDuzia;
      }

      await enviarTelegram(
        `🟢 DÚZIAS: Número ${res.numero} na dúzia ${getDuzia(
          res.numero
        )}! ✅ Green para estratégia de dúzia [${vitoriaConsecutivaDuzia} VITÓRIA${
          vitoriaConsecutivaDuzia > 1 ? "S" : ""
        } CONSECUTIVA${
          vitoriaConsecutivaDuzia > 1 ? "S" : ""
        }]\n📊 Dúzias: Greens: ${totalGreensDuzia} | Reds: ${totalRedsDuzia} | Zeros: ${zerosDuzia}`,
        "duzia"
      );

      // Marcar este número como vencedor para ESTA estratégia
      ultimaVitoriaDz = {
        numero: res.numero,
        dataHora: new Date(),
      };

      // Também atualizamos a última vitória geral para referência
      ultimaVitoria = {
        numero: res.numero,
        cor: res.cor,
        estrategia: "duzia",
        dataHora: new Date(),
      };

      console.log(
        `Marcando ${res.numero} como última vitória para estratégia de dúzia.`
      );

      resetarAlertaDuzias();
    } else {
      await enviarTelegram(
        `🔄 DÚZIAS: Número ${res.numero} na dúzia ${getDuzia(
          res.numero
        )}, vamos para o G1 na estratégia de dúzia...`,
        "duzia"
      );
      rodadaG0Duzia = res;
      console.log(
        "Primeira tentativa falhou, indo para G1 na estratégia de dúzia"
      );
    }
  }
  // Segunda rodada após detectar padrão para dúzias (G1) - Removida a dependência de outras estratégias
  else if (alertaAtivoDuzia && duziaAlvo && rodadaG0Duzia) {
    console.log("Processando G1 para estratégia de dúzia");

    if (res.numero === 0) {
      totalZeros++; // Contador geral de zeros
      zerosDuzia++; // Contador específico de zeros para estratégia de dúzias
      totalGreensDuzia++;
      vitoriaConsecutivaDuzia++; // Incrementa contagem de vitórias consecutivas

      // Atualiza o contador de maior sequência de vitórias
      if (vitoriaConsecutivaDuzia > maiorVitoriaConsecutivaDuzia) {
        maiorVitoriaConsecutivaDuzia = vitoriaConsecutivaDuzia;
      }

      await enviarTelegram(
        `🟢 DÚZIAS: Número 0 caiu! ✅ Green no G1 para estratégia de dúzia [${vitoriaConsecutivaDuzia} VITÓRIA${
          vitoriaConsecutivaDuzia > 1 ? "S" : ""
        } CONSECUTIVA${
          vitoriaConsecutivaDuzia > 1 ? "S" : ""
        }]\n📊 Dúzias: Greens: ${totalGreensDuzia} | Reds: ${totalRedsDuzia} | Zeros: ${zerosDuzia}`,
        "duzia"
      );

      // Marcar este número como vencedor para ESTA estratégia
      ultimaVitoriaDz = {
        numero: res.numero,
        dataHora: new Date(),
      };

      // Também atualizamos a última vitória geral para referência
      ultimaVitoria = {
        numero: res.numero,
        cor: res.cor,
        estrategia: "duzia",
        dataHora: new Date(),
      };

      console.log(
        `Marcando ${res.numero} como última vitória para estratégia de dúzia.`
      );

      resetarAlertaDuzias();
    } else if (duziaAlvo.includes(getDuzia(res.numero))) {
      totalGreensDuzia++;
      vitoriaConsecutivaDuzia++; // Incrementa contagem de vitórias consecutivas

      // Atualiza o contador de maior sequência de vitórias
      if (vitoriaConsecutivaDuzia > maiorVitoriaConsecutivaDuzia) {
        maiorVitoriaConsecutivaDuzia = vitoriaConsecutivaDuzia;
      }

      await enviarTelegram(
        `🟢 DÚZIAS: Número ${res.numero} na dúzia ${getDuzia(
          res.numero
        )}! ✅ Green no G1 para estratégia de dúzia [${vitoriaConsecutivaDuzia} VITÓRIA${
          vitoriaConsecutivaDuzia > 1 ? "S" : ""
        } CONSECUTIVA${
          vitoriaConsecutivaDuzia > 1 ? "S" : ""
        }]\n📊 Dúzias: Greens: ${totalGreensDuzia} | Reds: ${totalRedsDuzia} | Zeros: ${zerosDuzia}`,
        "duzia"
      );

      // Marcar este número como vencedor para ESTA estratégia
      ultimaVitoriaDz = {
        numero: res.numero,
        dataHora: new Date(),
      };

      // Também atualizamos a última vitória geral para referência
      ultimaVitoria = {
        numero: res.numero,
        cor: res.cor,
        estrategia: "duzia",
        dataHora: new Date(),
      };

      console.log(
        `Marcando ${res.numero} como última vitória para estratégia de dúzia.`
      );

      resetarAlertaDuzias();
    } else {
      totalRedsDuzia++;
      vitoriaConsecutivaDuzia = 0; // Reseta contagem de vitórias consecutivas

      await enviarTelegram(
        `❌ DÚZIAS: Número ${res.numero} na dúzia ${getDuzia(
          res.numero
        )}. ❌ Red/perca na estratégia de dúzia\n📊 Dúzias: Greens: ${totalGreensDuzia} | Reds: ${totalRedsDuzia} | Zeros: ${zerosDuzia}`,
        "duzia"
      );

      // Marcar este número para saber que a última derrota foi na estratégia de dúzias
      ultimaVitoriaDz = {
        numero: res.numero,
        dataHora: new Date(),
      };

      // Também atualizamos a última vitória geral para referência
      ultimaVitoria = {
        numero: res.numero,
        cor: res.cor,
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
    alertaAtivoDuzia = false;
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
  console.log(
    `Alertas ativos: 5 Cores: ${alertaAtivoCor5}, 3 Cores: ${alertaAtivoCor3}, Colunas: ${alertaAtivoColuna}, Dúzias: ${alertaAtivoDuzia}`
  );
  console.log(`Cores alvo: 5 Cores: ${corAlvo5}, 3 Cores: ${corAlvo3}`);
  console.log(`Coluna alvo: ${colunaAlvo ? colunaAlvo.join(",") : "null"}`);
  console.log(`Dúzia alvo: ${duziaAlvo ? duziaAlvo.join(",") : "null"}`);
  console.log(`Última vitória 5 cores: ${JSON.stringify(ultimaVitoriaCor5)}`);
  console.log(`Última vitória 3 cores: ${JSON.stringify(ultimaVitoriaCor3)}`);
  console.log(`Total números no histórico: ${historico.length}`);
  console.log(`-------------------`);

  // Processa estratégia de 5 cores
  await processarEstrategia5Cores(res);

  // Processa estratégia de 3 cores (trio)
  await processarEstrategia3Cores(res);

  // Processa estratégia de colunas (modificar para usar alertaAtivoColuna)
  await processarEstrategiaColunas(res);

  // Processa estratégia de dúzias (modificar para usar alertaAtivoDuzia)
  await processarEstrategiaDuzias(res);

  // Envia resumo a cada 100 rodadas
  if (contadorRodadas % 100 === 0) {
    await enviarResumo();
  }

  // Envia relatório detalhado a cada 200 rodadas
  if (contadorRodadas % 200 === 0) {
    await enviarRelatorioDetalhado();
  }

  verificarSequenciaManual();
}

// Envia mensagem para o Telegram - MODIFICADA para suportar diferentes bots/grupos
async function enviarTelegram(mensagem, estrategia = "geral") {
  try {
    console.log(`Enviando para Telegram (${estrategia}): ${mensagem}`);

    let token, chatId;

    // Seleciona o token e chat ID apropriados com base na estratégia
    switch (estrategia) {
      case "cor":
        token = TELEGRAM_TOKEN_CINCO_CORES;
        chatId = TELEGRAM_CHAT_ID_CINCO_CORES;
        break;
      case "trioCor":
      case "trioCorAlerta":
        token = TELEGRAM_TOKEN_TRIO_CORES;
        chatId = TELEGRAM_CHAT_ID_TRIO_CORES;
        break;
      case "coluna":
      case "duzia":
        token = TELEGRAM_TOKEN_COLUNAS_DUZIAS;
        chatId = TELEGRAM_CHAT_ID_COLUNAS_DUZIAS;
        break;
      default:
        // Para relatórios e resultados gerais
        token = TELEGRAM_TOKEN;
        chatId = TELEGRAM_CHAT_ID;
    }

    const url = `https://api.telegram.org/bot${token}/sendMessage`;

    const response = await axios.post(url, {
      chat_id: chatId,
      text: mensagem,
    });

    console.log(`Mensagem enviada com sucesso para grupo de ${estrategia}`);
    return response;
  } catch (err) {
    console.error(
      `Erro ao enviar mensagem para o Telegram (${estrategia}):`,
      err.message
    );
    if (err.response) {
      console.error("Resposta do Telegram:", err.response.data);
    }

    // Em caso de erro, tenta enviar pelo bot principal como fallback
    if (estrategia !== "geral") {
      try {
        console.log("Tentando enviar pelo bot principal como fallback...");
        const urlFallback = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
        await axios.post(urlFallback, {
          chat_id: TELEGRAM_CHAT_ID,
          text: `[FALLBACK - Falha ao enviar para grupo ${estrategia}] ${mensagem}`,
        });
        console.log("Mensagem enviada pelo bot fallback");
      } catch (fallbackErr) {
        console.error("Erro também no fallback:", fallbackErr.message);
      }
    }
  }
}

// Envia resumo das estatísticas
async function enviarResumo() {
  // Resumo geral para o grupo principal
  await enviarTelegram(`📊 RESUMO PARCIAL (últimas ${contadorRodadas} rodadas):
✅ 5 CORES: Greens: ${totalGreensCor5} | Reds: ${totalRedsCor5} | Zeros: ${zerosCor5} | Maior sequência: ${maiorVitoriaConsecutivaCor5} vitórias
✅ 3 CORES: Greens: ${totalGreensCor3} | Reds: ${totalRedsCor3} | Zeros: ${zerosCor3} | Maior sequência: ${maiorVitoriaConsecutivaCor3} vitórias
✅ COLUNAS: Greens: ${totalGreensColuna} | Reds: ${totalRedsColuna} | Zeros: ${zerosColuna} | Maior sequência: ${maiorVitoriaConsecutivaColuna} vitórias
✅ DÚZIAS: Greens: ${totalGreensDuzia} | Reds: ${totalRedsDuzia} | Zeros: ${zerosDuzia} | Maior sequência: ${maiorVitoriaConsecutivaDuzia} vitórias
🟢 Total de Zeros: ${totalZeros}
📈 Total de rodadas: ${contadorRodadas}
🔴 Maior sequência de vermelhos: ${maiorSequenciaVermelho}
⚫ Maior sequência de pretos: ${maiorSequenciaPreto}`);

  // Resumo específico para o grupo de Cinco Cores
  await enviarTelegram(
    `📊 RESUMO PARCIAL - 5 CORES (últimas ${contadorRodadas} rodadas):
✅ Greens: ${totalGreensCor5} | Reds: ${totalRedsCor5} | Zeros: ${zerosCor5}
🔄 Maior sequência de vitórias: ${maiorVitoriaConsecutivaCor5}
${
  vitoriaConsecutivaCor5 > 0
    ? "🔥 Sequência atual: " +
      vitoriaConsecutivaCor5 +
      " vitória(s) consecutiva(s)"
    : ""
}
🔴 Maior sequência de vermelhos: ${maiorSequenciaVermelho}
⚫ Maior sequência de pretos: ${maiorSequenciaPreto}`,
    "cor"
  );

  // Resumo específico para o grupo de Trio de Cores
  await enviarTelegram(
    `📊 RESUMO PARCIAL - 3 CORES (últimas ${contadorRodadas} rodadas):
✅ Greens: ${totalGreensCor3} | Reds: ${totalRedsCor3} | Zeros: ${zerosCor3}
🔄 Maior sequência de vitórias: ${maiorVitoriaConsecutivaCor3}
${
  vitoriaConsecutivaCor3 > 0
    ? "🔥 Sequência atual: " +
      vitoriaConsecutivaCor3 +
      " vitória(s) consecutiva(s)"
    : ""
}
🔴 Maior sequência de vermelhos: ${maiorSequenciaVermelho}
⚫ Maior sequência de pretos: ${maiorSequenciaPreto}`,
    "trioCor"
  );

  // Resumo específico para o grupo de Colunas e Dúzias
  await enviarTelegram(
    `📊 RESUMO PARCIAL - COLUNAS & DÚZIAS (últimas ${contadorRodadas} rodadas):
✅ COLUNAS: Greens: ${totalGreensColuna} | Reds: ${totalRedsColuna} | Zeros: ${zerosColuna}
🔄 Maior sequência (colunas): ${maiorVitoriaConsecutivaColuna}
${
  vitoriaConsecutivaColuna > 0
    ? "🔥 Sequência atual: " +
      vitoriaConsecutivaColuna +
      " vitória(s) consecutiva(s)"
    : ""
}
✅ DÚZIAS: Greens: ${totalGreensDuzia} | Reds: ${totalRedsDuzia} | Zeros: ${zerosDuzia}
🔄 Maior sequência (dúzias): ${maiorVitoriaConsecutivaDuzia}
${
  vitoriaConsecutivaDuzia > 0
    ? "🔥 Sequência atual: " +
      vitoriaConsecutivaDuzia +
      " vitória(s) consecutiva(s)"
    : ""
}`,
    "coluna"
  );
}

// Função para relatório detalhado a cada 200 rodadas
async function enviarRelatorioDetalhado() {
  // Relatório completo para o grupo principal
  await enviarTelegram(`🔍 RELATÓRIO DETALHADO (RODADA #${contadorRodadas})

🎲 ESTATÍSTICAS DE 5 CORES:
✅ Greens: ${totalGreensCor5} (${Math.round(
    (totalGreensCor5 / (totalGreensCor5 + totalRedsCor5 || 1)) * 100
  )}% de aproveitamento)
❌ Reds: ${totalRedsCor5}
🟢 Zeros: ${zerosCor5}
🔄 Maior sequência de vitórias: ${maiorVitoriaConsecutivaCor5}
${
  vitoriaConsecutivaCor5 > 0
    ? "🔥 Sequência atual: " +
      vitoriaConsecutivaCor5 +
      " vitória(s) consecutiva(s)"
    : ""
}

🎲 ESTATÍSTICAS DE 3 CORES (TRIO):
✅ Greens: ${totalGreensCor3} (${Math.round(
    (totalGreensCor3 / (totalGreensCor3 + totalRedsCor3 || 1)) * 100
  )}% de aproveitamento)
❌ Reds: ${totalRedsCor3}
🟢 Zeros: ${zerosCor3}
🔄 Maior sequência de vitórias: ${maiorVitoriaConsecutivaCor3}
${
  vitoriaConsecutivaCor3 > 0
    ? "🔥 Sequência atual: " +
      vitoriaConsecutivaCor3 +
      " vitória(s) consecutiva(s)"
    : ""
}

🎲 ESTATÍSTICAS DE COLUNAS:
✅ Greens: ${totalGreensColuna} (${Math.round(
    (totalGreensColuna / (totalGreensColuna + totalRedsColuna || 1)) * 100
  )}% de aproveitamento)
❌ Reds: ${totalRedsColuna}
🟢 Zeros: ${zerosColuna}
🔄 Maior sequência de vitórias: ${maiorVitoriaConsecutivaColuna}
${
  vitoriaConsecutivaColuna > 0
    ? "🔥 Sequência atual: " +
      vitoriaConsecutivaColuna +
      " vitória(s) consecutiva(s)"
    : ""
}

🎲 ESTATÍSTICAS DE DÚZIAS:
✅ Greens: ${totalGreensDuzia} (${Math.round(
    (totalGreensDuzia / (totalGreensDuzia + totalRedsDuzia || 1)) * 100
  )}% de aproveitamento)
❌ Reds: ${totalRedsDuzia}
🟢 Zeros: ${zerosDuzia}
🔄 Maior sequência de vitórias: ${maiorVitoriaConsecutivaDuzia}
${
  vitoriaConsecutivaDuzia > 0
    ? "🔥 Sequência atual: " +
      vitoriaConsecutivaDuzia +
      " vitória(s) consecutiva(s)"
    : ""
}

🔴 Maior sequência de vermelhos: ${maiorSequenciaVermelho}
⚫ Maior sequência de pretos: ${maiorSequenciaPreto}
🟢 Total de Zeros: ${totalZeros}
📈 Total de rodadas analisadas: ${contadorRodadas}

📱 Bot monitorando 24/7 - Mantenha as apostas responsáveis!`);

  // Relatório específico para o grupo de Cinco Cores
  await enviarTelegram(
    `🔍 RELATÓRIO DETALHADO - 5 CORES (RODADA #${contadorRodadas})

🎲 ESTATÍSTICAS DE 5 CORES:
✅ Greens: ${totalGreensCor5} (${Math.round(
      (totalGreensCor5 / (totalGreensCor5 + totalRedsCor5 || 1)) * 100
    )}% de aproveitamento)
❌ Reds: ${totalRedsCor5}
🟢 Zeros: ${zerosCor5}
🔄 Maior sequência de vitórias: ${maiorVitoriaConsecutivaCor5}
${
  vitoriaConsecutivaCor5 > 0
    ? "🔥 Sequência atual: " +
      vitoriaConsecutivaCor5 +
      " vitória(s) consecutiva(s)"
    : ""
}

🔴 Maior sequência de vermelhos: ${maiorSequenciaVermelho}
⚫ Maior sequência de pretos: ${maiorSequenciaPreto}
📈 Total de rodadas analisadas: ${contadorRodadas}

📱 Bot monitorando 24/7 - Mantenha as apostas responsáveis!`,
    "cor"
  );

  // NOVO: Relatório específico para o grupo de Trio de Cores
  await enviarTelegram(
    `🔍 RELATÓRIO DETALHADO - 3 CORES (TRIO) (RODADA #${contadorRodadas})

🎲 ESTATÍSTICAS DE 3 CORES (TRIO):
✅ Greens: ${totalGreensCor3} (${Math.round(
      (totalGreensCor3 / (totalGreensCor3 + totalRedsCor3 || 1)) * 100
    )}% de aproveitamento)
❌ Reds: ${totalRedsCor3}
🟢 Zeros: ${zerosCor3}
🔄 Maior sequência de vitórias: ${maiorVitoriaConsecutivaCor3}
${
  vitoriaConsecutivaCor3 > 0
    ? "🔥 Sequência atual: " +
      vitoriaConsecutivaCor3 +
      " vitória(s) consecutiva(s)"
    : ""
}

🔴 Maior sequência de vermelhos: ${maiorSequenciaVermelho}
⚫ Maior sequência de pretos: ${maiorSequenciaPreto}
📈 Total de rodadas analisadas: ${contadorRodadas}

📱 Bot monitorando 24/7 - Mantenha as apostas responsáveis!`,
    "trioCor"
  );

  // Relatório específico para o grupo de Colunas e Dúzias
  await enviarTelegram(
    `🔍 RELATÓRIO DETALHADO - COLUNAS & DÚZIAS (RODADA #${contadorRodadas})

🎲 ESTATÍSTICAS DE COLUNAS:
✅ Greens: ${totalGreensColuna} (${Math.round(
      (totalGreensColuna / (totalGreensColuna + totalRedsColuna || 1)) * 100
    )}% de aproveitamento)
❌ Reds: ${totalRedsColuna}
🟢 Zeros: ${zerosColuna}
🔄 Maior sequência de vitórias: ${maiorVitoriaConsecutivaColuna}
${
  vitoriaConsecutivaColuna > 0
    ? "🔥 Sequência atual: " +
      vitoriaConsecutivaColuna +
      " vitória(s) consecutiva(s)"
    : ""
}

🎲 ESTATÍSTICAS DE DÚZIAS:
✅ Greens: ${totalGreensDuzia} (${Math.round(
      (totalGreensDuzia / (totalGreensDuzia + totalRedsDuzia || 1)) * 100
    )}% de aproveitamento)
❌ Reds: ${totalRedsDuzia}
🟢 Zeros: ${zerosDuzia}
🔄 Maior sequência de vitórias: ${maiorVitoriaConsecutivaDuzia}
${
  vitoriaConsecutivaDuzia > 0
    ? "🔥 Sequência atual: " +
      vitoriaConsecutivaDuzia +
      " vitória(s) consecutiva(s)"
    : ""
}

📈 Total de rodadas analisadas: ${contadorRodadas}

📱 Bot monitorando 24/7 - Mantenha as apostas responsáveis!`,
    "coluna"
  );
}

// Adicione esta nova função para enviar o relatório diário e reiniciar contadores
async function enviarRelatorioDiarioEReiniciar() {
  const hoje = new Date();
  const dataFormatada = hoje.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  // Relatório completo para o grupo principal
  await enviarTelegram(`📅 RELATÓRIO FINAL DO DIA - ${dataFormatada}

🎲 RESUMO DAS ÚLTIMAS 24 HORAS:
✅ 5 CORES: Greens: ${totalGreensCor5} | Reds: ${totalRedsCor5} | Zeros: ${zerosCor5} | Maior sequência: ${maiorVitoriaConsecutivaCor5} vitórias
✅ 3 CORES (TRIO): Greens: ${totalGreensCor3} | Reds: ${totalRedsCor3} | Zeros: ${zerosCor3} | Maior sequência: ${maiorVitoriaConsecutivaCor3} vitórias
✅ COLUNAS: Greens: ${totalGreensColuna} | Reds: ${totalRedsColuna} | Zeros: ${zerosColuna} | Maior sequência: ${maiorVitoriaConsecutivaColuna} vitórias
✅ DÚZIAS: Greens: ${totalGreensDuzia} | Reds: ${totalRedsDuzia} | Zeros: ${zerosDuzia} | Maior sequência: ${maiorVitoriaConsecutivaDuzia} vitórias
🟢 Total de Zeros: ${totalZeros}
📈 Total de rodadas analisadas: ${contadorRodadas}

🔴 Maior sequência de vermelhos: ${maiorSequenciaVermelho}
⚫ Maior sequência de pretos: ${maiorSequenciaPreto}

💯 TAXA DE APROVEITAMENTO:
🎯 5 Cores: ${Math.round(
    (totalGreensCor5 / (totalGreensCor5 + totalRedsCor5 || 1)) * 100
  )}%
🎯 3 Cores (Trio): ${Math.round(
    (totalGreensCor3 / (totalGreensCor3 + totalRedsCor3 || 1)) * 100
  )}%
🎯 Colunas: ${Math.round(
    (totalGreensColuna / (totalGreensColuna + totalRedsColuna || 1)) * 100
  )}%
🎯 Dúzias: ${Math.round(
    (totalGreensDuzia / (totalGreensDuzia + totalRedsDuzia || 1)) * 100
  )}%

🔄 Contadores reiniciados para o novo dia.
📱 Bot continua monitorando 24/7 - Boas apostas!`);

  // Relatório específico para o grupo de Cinco Cores
  await enviarTelegram(
    `📅 RELATÓRIO FINAL DO DIA - 5 CORES - ${dataFormatada}

🎲 RESUMO DAS ÚLTIMAS 24 HORAS:
✅ 5 CORES: Greens: ${totalGreensCor5} | Reds: ${totalRedsCor5} | Zeros: ${zerosCor5}
🔄 Maior sequência de vitórias: ${maiorVitoriaConsecutivaCor5}
${
  vitoriaConsecutivaCor5 > 0
    ? "🔥 Sequência atual: " +
      vitoriaConsecutivaCor5 +
      " vitória(s) consecutiva(s)"
    : ""
}

🔴 Maior sequência de vermelhos: ${maiorSequenciaVermelho}
⚫ Maior sequência de pretos: ${maiorSequenciaPreto}

💯 TAXA DE APROVEITAMENTO:
🎯 5 Cores: ${Math.round(
      (totalGreensCor5 / (totalGreensCor5 + totalRedsCor5 || 1)) * 100
    )}%

🔄 Contadores reiniciados para o novo dia.
📱 Bot continua monitorando 24/7 - Boas apostas!`,
    "cor"
  );

  // NOVO: Relatório específico para o grupo de Trio de Cores
  await enviarTelegram(
    `📅 RELATÓRIO FINAL DO DIA - 3 CORES (TRIO) - ${dataFormatada}

🎲 RESUMO DAS ÚLTIMAS 24 HORAS:
✅ 3 CORES (TRIO): Greens: ${totalGreensCor3} | Reds: ${totalRedsCor3} | Zeros: ${zerosCor3}
🔄 Maior sequência de vitórias: ${maiorVitoriaConsecutivaCor3}
${
  vitoriaConsecutivaCor3 > 0
    ? "🔥 Sequência atual: " +
      vitoriaConsecutivaCor3 +
      " vitória(s) consecutiva(s)"
    : ""
}

🔴 Maior sequência de vermelhos: ${maiorSequenciaVermelho}
⚫ Maior sequência de pretos: ${maiorSequenciaPreto}

💯 TAXA DE APROVEITAMENTO:
🎯 3 Cores (Trio): ${Math.round(
      (totalGreensCor3 / (totalGreensCor3 + totalRedsCor3 || 1)) * 100
    )}%

🔄 Contadores reiniciados para o novo dia.
📱 Bot continua monitorando 24/7 - Boas apostas!`,
    "trioCor"
  );

  // Relatório específico para o grupo de Colunas e Dúzias
  await enviarTelegram(
    `📅 RELATÓRIO FINAL DO DIA - COLUNAS & DÚZIAS - ${dataFormatada}

🎲 RESUMO DAS ÚLTIMAS 24 HORAS:
✅ COLUNAS: Greens: ${totalGreensColuna} | Reds: ${totalRedsColuna} | Zeros: ${zerosColuna}
🔄 Maior sequência (colunas): ${maiorVitoriaConsecutivaColuna}
${
  vitoriaConsecutivaColuna > 0
    ? "🔥 Sequência atual: " +
      vitoriaConsecutivaColuna +
      " vitória(s) consecutiva(s)"
    : ""
}

✅ DÚZIAS: Greens: ${totalGreensDuzia} | Reds: ${totalRedsDuzia} | Zeros: ${zerosDuzia}
🔄 Maior sequência (dúzias): ${maiorVitoriaConsecutivaDuzia}
${
  vitoriaConsecutivaDuzia > 0
    ? "🔥 Sequência atual: " +
      vitoriaConsecutivaDuzia +
      " vitória(s) consecutiva(s)"
    : ""
}

💯 TAXA DE APROVEITAMENTO:
🎯 Colunas: ${Math.round(
      (totalGreensColuna / (totalGreensColuna + totalRedsColuna || 1)) * 100
    )}%
🎯 Dúzias: ${Math.round(
      (totalGreensDuzia / (totalGreensDuzia + totalRedsDuzia || 1)) * 100
    )}%

🔄 Contadores reiniciados para o novo dia.
📱 Bot continua monitorando 24/7 - Boas apostas!`,
    "coluna"
  );

  // Reinicia todos os contadores para o novo dia
  totalGreensCor5 = 0;
  totalRedsCor5 = 0;
  zerosCor5 = 0; // Reset de zeros para estratégia de 5 cores

  totalGreensCor3 = 0;
  totalRedsCor3 = 0;
  zerosCor3 = 0; // Reset de zeros para estratégia de 3 cores

  totalGreensColuna = 0;
  totalRedsColuna = 0;
  zerosColuna = 0; // Reset de zeros para estratégia de colunas

  totalGreensDuzia = 0;
  totalRedsDuzia = 0;
  zerosDuzia = 0; // Reset de zeros para estratégia de dúzias

  totalZeros = 0; // Reset do contador geral de zeros
  contadorRodadas = 0;

  // Resetar contadores de vitórias consecutivas
  vitoriaConsecutivaCor5 = 0;
  vitoriaConsecutivaCor3 = 0;
  vitoriaConsecutivaColuna = 0;
  vitoriaConsecutivaDuzia = 0;

  // Não reiniciamos as maiores sequências (nem de cores nem de vitórias), pois são recordes históricos
  // Se quiser reiniciar também, descomente as linhas abaixo
  /*
  maiorSequenciaVermelho = 0;
  maiorSequenciaPreto = 0;
  maiorVitoriaConsecutivaCor5 = 0;
  maiorVitoriaConsecutivaCor3 = 0;
  maiorVitoriaConsecutivaColuna = 0;
  maiorVitoriaConsecutivaDuzia = 0;
  */

  console.log("Contadores reiniciados para o novo dia.");
}

// Função para verificar a sequência manualmente (para diagnóstico)
function verificarSequenciaManual() {
  if (historico.length === 0) return;

  let seqVermelho = 0;
  let seqPreto = 0;
  let maxVermelho = 0;
  let maxPreto = 0;

  // Começa do item mais recente (índice 0)
  for (let i = 0; i < historico.length; i++) {
    if (historico[i].cor === "vermelho") {
      seqVermelho++;
      seqPreto = 0;
      if (seqVermelho > maxVermelho) maxVermelho = seqVermelho;
    } else if (historico[i].cor === "preto") {
      seqPreto++;
      seqVermelho = 0;
      if (seqPreto > maxPreto) maxPreto = seqPreto;
    } else {
      // Zero ou outra cor
      seqVermelho = 0;
      seqPreto = 0;
    }
  }

  console.log(`VERIFICAÇÃO MANUAL:`);
  console.log(`Maior sequência de vermelhos (manual): ${maxVermelho}`);
  console.log(`Maior sequência de pretos (manual): ${maxPreto}`);
  console.log(
    `Compare com sequência armazenada: Vermelho ${maiorSequenciaVermelho}, Preto ${maiorSequenciaPreto}`
  );

  // Se diferente, lista os últimos 10 números para diagnóstico
  if (
    maxVermelho !== maiorSequenciaVermelho ||
    maxPreto !== maiorSequenciaPreto
  ) {
    console.log("DISCREPÂNCIA DETECTADA! Últimos 10 números:");
    historico.slice(0, 10).forEach((item, index) => {
      console.log(`${index}: ${item.numero} (${item.cor})`);
    });
  }
}

// Função para verificar a mudança de dia
function verificarMudancaDeDia() {
  const dataAtual = new Date();
  const diaAtual = dataAtual.getDate();

  // Se o dia mudou
  if (diaAtual !== ultimoDiaVerificado) {
    console.log(
      `Dia mudou de ${ultimoDiaVerificado} para ${diaAtual}. Enviando relatório diário e reiniciando contadores.`
    );

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

    // Envia mensagem inicial para todos os grupos
    await enviarTelegram(
      "🎲 Bot da Roleta Lightning iniciado! Monitorando resultados e enviando relatórios gerais..."
    );
    await enviarTelegram(
      "🎲 Bot da Roleta Lightning iniciado! Monitorando estratégia de 5 CORES...",
      "cor"
    );
    await enviarTelegram(
      "🎲 Bot da Roleta Lightning iniciado! Monitorando estratégia de 3 CORES (TRIO)...",
      "trioCor"
    );
    await enviarTelegram(
      "🎲 Bot da Roleta Lightning iniciado! Monitorando estratégias de COLUNAS e DÚZIAS...",
      "coluna"
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
