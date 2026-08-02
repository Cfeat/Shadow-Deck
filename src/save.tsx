import React, { useState, useEffect } from "react";
import { X, Save, Download, Trash2, Clock } from "lucide-react";
import { listSaves, getSave, putSave, deleteSave, SaveSlotMeta } from "./api";
import type { GamePhase, Card, Player, Relic, Potion, BattleState, Enemy } from "./types";

export interface SaveGameState {
  phase: GamePhase;
  floor: number;
  player: Player;
  deck: Card[];
  relics: Relic[];
  potions: Potion[];
  battleState?: BattleState;
  enemy?: Enemy | null;
  turn?: number;
  barricadeActive?: boolean;
  omegaCount?: number;
  demonFormStrength?: number;
  ruptureActive?: boolean;
  nextAttackDouble?: boolean;
  towerFloors?: any[][];
  currentNodeId?: string;
}

interface SaveLoadModalProps {
  mode: "save" | "load";
  onClose: () => void;
  onLoad: (state: SaveGameState) => void;
  getCurrentState: () => SaveGameState;
}

const SLOT_NAMES = ["Slot I", "Slot II", "Slot III"];

const SaveLoadModal: React.FC<SaveLoadModalProps> = ({ mode, onClose, onLoad, getCurrentState }) => {
  const [slots, setSlots] = useState<(SaveSlotMeta | null)[]>([null, null, null]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  useEffect(() => {
    loadSlots();
  }, []);

  const loadSlots = async () => {
    setLoading(true);
    try {
      const data = await listSaves();
      const arr: (SaveSlotMeta | null)[] = [null, null, null];
      data.saves.forEach(s => { if (s.slot >= 0 && s.slot <= 2) arr[s.slot] = s; });
      setSlots(arr);
    } catch {
      // No saves yet or offline
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (slot: number) => {
    try {
      const state = getCurrentState();
      await putSave(slot, state, state.floor, state.player.currentHp, state.player.gold);
      setActionMsg(`Saved to ${SLOT_NAMES[slot]}!`);
      await loadSlots();
      setTimeout(() => setActionMsg(""), 2000);
    } catch (err: any) {
      setActionMsg(`Save failed: ${err.message}`);
    }
  };

  const handleLoad = async (slot: number) => {
    try {
      const data = await getSave(slot);
      onLoad(data.gameState as SaveGameState);
      onClose();
    } catch (err: any) {
      setActionMsg(`Load failed: ${err.message}`);
    }
  };

  const handleDelete = async (slot: number) => {
    try {
      await deleteSave(slot);
      setConfirmDelete(null);
      setActionMsg(`Save slot ${slot + 1} deleted.`);
      await loadSlots();
      setTimeout(() => setActionMsg(""), 2000);
    } catch (err: any) {
      setActionMsg(`Delete failed: ${err.message}`);
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-8 w-full max-w-lg shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        <h2 className="text-3xl font-fantasy text-center mb-2 text-slate-100">
          {mode === "save" ? "Save Game" : "Load Game"}
        </h2>
        <p className="text-center text-slate-500 text-sm mb-8">
          {mode === "save" ? "Choose a slot to save your progress" : "Choose a save to continue"}
        </p>

        {actionMsg && (
          <div className="mb-4 text-center text-sm bg-slate-800 border border-slate-600 rounded px-3 py-2 text-green-400">
            {actionMsg}
          </div>
        )}

        {loading ? (
          <div className="text-center text-slate-500 py-8 animate-pulse">Loading saves...</div>
        ) : (
          <div className="flex flex-col gap-4">
            {[0, 1, 2].map((slot) => {
              const save = slots[slot];
              return (
                <div
                  key={slot}
                  className="flex items-center justify-between bg-slate-800 border border-slate-700 rounded-lg p-4 hover:border-slate-500 transition-colors"
                >
                  <div className="flex-1">
                    <div className="font-fantasy text-lg text-slate-200">{SLOT_NAMES[slot]}</div>
                    {save ? (
                      <div className="text-sm text-slate-400 flex items-center gap-3 mt-1">
                        <span>Floor {save.floor}</span>
                        <span>❤️ {save.hp}</span>
                        <span className="text-yellow-500">${save.gold}</span>
                        <span className="flex items-center gap-1 text-slate-500">
                          <Clock size={12} /> {new Date(save.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    ) : (
                      <div className="text-sm text-slate-600 italic">Empty</div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {mode === "save" && (
                      <button
                        onClick={() => handleSave(slot)}
                        className="p-2 bg-blue-900/50 border border-blue-700 hover:bg-blue-800 rounded text-blue-300 transition-colors"
                        title="Save"
                      >
                        <Save size={18} />
                      </button>
                    )}
                    {mode === "load" && save && (
                      <button
                        onClick={() => handleLoad(slot)}
                        className="p-2 bg-green-900/50 border border-green-700 hover:bg-green-800 rounded text-green-300 transition-colors"
                        title="Load"
                      >
                        <Download size={18} />
                      </button>
                    )}
                    {save && (
                      <>
                        {confirmDelete === slot ? (
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleDelete(slot)}
                              className="px-2 py-1 bg-red-900 border border-red-700 rounded text-red-300 text-xs font-bold transition-colors"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setConfirmDelete(null)}
                              className="px-2 py-1 bg-slate-700 border border-slate-600 rounded text-slate-300 text-xs transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDelete(slot)}
                            className="p-2 bg-slate-700 hover:bg-red-900/50 border border-slate-600 hover:border-red-700 rounded text-slate-400 hover:text-red-400 transition-colors"
                            title="Delete save"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-6 text-center">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded font-fantasy tracking-wider text-slate-400 hover:text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SaveLoadModal;
