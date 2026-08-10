/**
 * src/core/ContentPoolManager.js
 * Core Manager per il caricamento, indicizzazione e campionamento dei pool di contenuti.
 * 
 * Gestisce l'estrazione casuale di domande/frasi senza ripetizioni all'interno della stessa sessione
 * e supporta sia pool in memoria che caricamento dinamico da file JSON/database.
 */

const fs = require('fs');
const path = require('path');

class ContentPoolManager {
  constructor() {
    // Map di pool registrati per id gioco e categoria
    // Estruttura: { 'non-ho-mai': { 'classic': [...], 'spicy': [...] } }
    this.pools = new Map();
  }

  /**
   * Carica un file JSON di frasi/domande e lo assegna a un gioco e categoria.
   * 
   * @param {string} gameId ID del gioco (es. 'non-ho-mai')
   * @param {string} category Category name (es. 'classic')
   * @param {string} filePath Percorso assoluto o relativo al file JSON
   */
  loadPoolFromFile(gameId, category, filePath) {
    try {
      if (!fs.existsSync(filePath)) {
        console.warn(`[ContentPool] File non trovato: ${filePath}`);
        return;
      }
      const rawData = fs.readFileSync(filePath, 'utf-8');
      const items = JSON.parse(rawData);

      this.registerPool(gameId, category, items);
      console.log(`[ContentPool] Caricate ${items.length} frasi per [${gameId}:${category}]`);
    } catch (err) {
      console.error(`[ContentPool] Errore nel caricamento del pool [${gameId}:${category}]:`, err.message);
    }
  }

  /**
   * Registra manualmente un pool di contenuti.
   */
  registerPool(gameId, category, items) {
    if (!this.pools.has(gameId)) {
      this.pools.set(gameId, new Map());
    }

    const gamePools = this.pools.get(gameId);
    
    // Assegna ID univoci se non presenti
    const processedItems = items.map((item, index) => {
      if (typeof item === 'string') {
        return { id: `${category}_${index + 1}`, text: item, category };
      }
      return { id: item.id || `${category}_${index + 1}`, text: item.text, category: item.category || category, ...item };
    });

    gamePools.set(category, processedItems);
  }

  /**
   * Restituisce tutte le categorie disponibili per un gioco.
   */
  getCategories(gameId) {
    if (!this.pools.has(gameId)) return [];
    return Array.from(this.pools.get(gameId).keys());
  }

  /**
   * Estrae un elemento casuale dal pool evitando di ripetere quelli già usati nella sessione.
   * 
   * @param {string} gameId ID del gioco
   * @param {string} category Categoria selezionata (oppure 'all')
   * @param {Array<string>} usedIds Lista degli ID già estratti in questa sessione
   * @returns {Object|null} L'oggetto frase estratto o null se il pool è esaurito
   */
  drawRandomItem(gameId, category = 'all', usedIds = []) {
    if (!this.pools.has(gameId)) return null;

    const gamePools = this.pools.get(gameId);
    let candidateItems = [];

    if (category === 'all') {
      for (const items of gamePools.values()) {
        candidateItems.push(...items);
      }
    } else if (gamePools.has(category)) {
      candidateItems = gamePools.get(category);
    } else {
      // Fallback alla prima categoria disponibile
      const firstCat = this.getCategories(gameId)[0];
      if (firstCat) candidateItems = gamePools.get(firstCat);
    }

    // Filtra gli elementi già estratti
    const usedSet = new Set(usedIds);
    let availableItems = candidateItems.filter(item => !usedSet.has(item.id));

    // Se tutte le frasi della categoria sono state usate, resetta il pool per consentire il riutilizzo
    if (availableItems.length === 0 && candidateItems.length > 0) {
      console.log(`[ContentPool] Pool esaurito per [${gameId}:${category}]. Riciclo contenuti.`);
      availableItems = candidateItems;
    }

    if (availableItems.length === 0) return null;

    // Selezione casuale uniformemente distribuita
    const randomIndex = Math.floor(Math.random() * availableItems.length);
    return availableItems[randomIndex];
  }
}

module.exports = new ContentPoolManager();
