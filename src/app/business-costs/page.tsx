"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMoney } from "@/utils/calculations";
import {
  EquipmentItem,
  OverheadItem,
  listEquipment,
  listOverheads,
  createOrUpdateEquipment,
  createOrUpdateOverhead,
  deleteEquipment,
  deleteOverhead,
  getBusinessSettings,
  upsertBusinessSettings,
  computeEquipmentPerBatch,
  computeOverheadPerBatch,
} from "@/utils/businessCosts";

export default function BusinessCostsPage() {
  const [equipment, setEquipment] = useState<EquipmentItem[]>([]);
  const [overheads, setOverheads] = useState<OverheadItem[]>([]);
  const [batchesPerMonth, setBatchesPerMonth] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [authMissing, setAuthMissing] = useState<boolean>(false);

  // Equipment form state
  const [eqName, setEqName] = useState("");
  const [eqPrice, setEqPrice] = useState<string>("");
  const [eqBatches, setEqBatches] = useState<string>("");

  // Equipment edit state
  const [editingEqId, setEditingEqId] = useState<string | null>(null);
  const [editEqName, setEditEqName] = useState<string>("");
  const [editEqPrice, setEditEqPrice] = useState<string>("");
  const [editEqBatches, setEditEqBatches] = useState<string>("");

  // Overhead form state
  const [ovName, setOvName] = useState("");
  const [ovMonthly, setOvMonthly] = useState<string>("");

  // Overhead edit state
  const [editingOvId, setEditingOvId] = useState<string | null>(null);
  const [editOvName, setEditOvName] = useState<string>("");
  const [editOvMonthly, setEditOvMonthly] = useState<string>("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [settings, eq, ov] = await Promise.all([
          getBusinessSettings(),
          listEquipment(),
          listOverheads(),
        ]);
        if (settings == null) {
          setAuthMissing(true);
          setEquipment([]);
          setOverheads([]);
          setBatchesPerMonth(0);
        } else {
          setAuthMissing(false);
          setEquipment(eq);
          setOverheads(ov);
          setBatchesPerMonth(settings.batchesPerMonth);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const equipmentPerBatch = useMemo(() => computeEquipmentPerBatch(equipment), [equipment]);
  const overheadPerBatch = useMemo(
    () => computeOverheadPerBatch(overheads, batchesPerMonth),
    [overheads, batchesPerMonth]
  );
  const combinedPerBatch = equipmentPerBatch + overheadPerBatch;

  async function handleAddEquipment() {
    const name = (eqName || "").trim();
    const price = Number((eqPrice || "").replace(/\D/g, "")) || 0;
    const batches = Math.floor(Number((eqBatches || "").replace(/\D/g, "")) || 0);
    if (!name) return;
    await createOrUpdateEquipment({ name, price, expectedTotalBatches: batches });
    setEqName("");
    setEqPrice("");
    setEqBatches("");
    setEquipment(await listEquipment());
  }

  function startEditEquipment(eq: EquipmentItem) {
    setEditingEqId(eq.id);
    setEditEqName(eq.name);
    setEditEqPrice(String(eq.price));
    setEditEqBatches(String(eq.expectedTotalBatches));
  }

  async function saveEditEquipment(id: string) {
    const name = (editEqName || "").trim();
    const price = Number((editEqPrice || "").replace(/\D/g, "")) || 0;
    const batches = Math.floor(Number((editEqBatches || "").replace(/\D/g, "")) || 0);
    if (!name) return;
    await createOrUpdateEquipment({ id, name, price, expectedTotalBatches: batches });
    setEditingEqId(null);
    setEquipment(await listEquipment());
  }

  function cancelEditEquipment() {
    setEditingEqId(null);
  }

  async function handleAddOverhead() {
    const name = (ovName || "").trim();
    const monthlyAmount = Number((ovMonthly || "").replace(/\D/g, "")) || 0;
    if (!name) return;
    await createOrUpdateOverhead({ name, monthlyAmount });
    setOvName("");
    setOvMonthly("");
    setOverheads(await listOverheads());
  }

  function startEditOverhead(ov: OverheadItem) {
    setEditingOvId(ov.id);
    setEditOvName(ov.name);
    setEditOvMonthly(String(ov.monthlyAmount));
  }

  async function saveEditOverhead(id: string) {
    const name = (editOvName || "").trim();
    const monthlyAmount = Number((editOvMonthly || "").replace(/\D/g, "")) || 0;
    if (!name) return;
    await createOrUpdateOverhead({ id, name, monthlyAmount });
    setEditingOvId(null);
    setOverheads(await listOverheads());
  }

  function cancelEditOverhead() {
    setEditingOvId(null);
  }

  async function handleSaveBatchesPerMonth(value: string) {
    const bpm = Math.floor(Number((value || "").replace(/\D/g, "")) || 0);
    await upsertBusinessSettings(bpm);
    setBatchesPerMonth(bpm);
  }

  if (loading) {
    return <div className="p-6 text-sm text-gray-500">Loading…</div>;
  }

  if (authMissing) {
    return (
      <div className="min-h-screen p-6 sm:p-10">
        <div className="max-w-5xl mx-auto space-y-6">
          <h1 className="text-2xl sm:text-3xl font-bold">Business Costs</h1>
          <p className="text-gray-600">Please log in to manage your Business Costs.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 sm:p-10">
      <div className="max-w-5xl mx-auto space-y-8">
        <header>
          <h1 className="text-2xl sm:text-3xl font-bold">Business Costs</h1>
          <p className="text-gray-600">Manage equipment and overhead to auto-apply per-batch costs.</p>
        </header>

        <section className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-64">Estimated batches per month</div>
                <Input
                  aria-label="Batches per month"
                  value={batchesPerMonth || ""}
                  onChange={(e) => {
                    const raw = e.target.value || "";
                    const digitsOnly = raw.replace(/\D/g, "");
                    setBatchesPerMonth(Number(digitsOnly || 0));
                  }}
                  onBlur={(e) => handleSaveBatchesPerMonth(e.target.value)}
                  inputMode="numeric"
                />
              </div>
              <div className="text-sm text-gray-600">Used to allocate monthly overhead per batch.</div>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Equipment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_120px] items-center gap-2">
                <Input placeholder="Name" value={eqName} onChange={(e) => setEqName(e.target.value)} />
                <Input
                  placeholder="Price"
                  value={eqPrice ? Number(eqPrice).toLocaleString('vi-VN') : ""}
                  onChange={(e) => {
                    const raw = e.target.value || "";
                    const digitsOnly = raw.replace(/\D/g, "");
                    setEqPrice(digitsOnly);
                  }}
                  inputMode="numeric"
                />
                <Input
                  placeholder="Expected total batches"
                  value={eqBatches ? Number(eqBatches).toLocaleString('vi-VN') : ""}
                  onChange={(e) => {
                    const raw = e.target.value || "";
                    const digitsOnly = raw.replace(/\D/g, "");
                    setEqBatches(digitsOnly);
                  }}
                  inputMode="numeric"
                />
                <Button onClick={handleAddEquipment}>Add</Button>
              </div>

              {equipment.length === 0 ? (
                <p className="text-sm text-gray-500">No equipment added yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Expected Batches</TableHead>
                      <TableHead className="text-right">Per Batch</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {equipment.map((eq) => {
                      const inEdit = editingEqId === eq.id;
                      const displayName = inEdit ? editEqName : eq.name;
                      const displayPrice = inEdit ? Number(editEqPrice || 0) : eq.price;
                      const displayBatches = inEdit ? Number(editEqBatches || 0) : eq.expectedTotalBatches;
                      const perBatch = displayBatches > 0 ? displayPrice / displayBatches : 0;
                      return (
                        <TableRow key={eq.id}>
                          <TableCell>
                            {inEdit ? (
                              <Input className="h-8" value={editEqName} onChange={(e) => setEditEqName(e.target.value)} />
                            ) : (
                              displayName
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {inEdit ? (
                              <Input
                                className="h-8 text-right"
                                value={editEqPrice ? Number(editEqPrice).toLocaleString('vi-VN') : ""}
                                onChange={(e) => {
                                  const raw = e.target.value || "";
                                  const digitsOnly = raw.replace(/\D/g, "");
                                  setEditEqPrice(digitsOnly);
                                }}
                                inputMode="numeric"
                              />
                            ) : (
                              formatMoney(eq.price)
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {inEdit ? (
                              <Input
                                className="h-8 text-right"
                                value={editEqBatches ? Number(editEqBatches).toLocaleString('vi-VN') : ""}
                                onChange={(e) => {
                                  const raw = e.target.value || "";
                                  const digitsOnly = raw.replace(/\D/g, "");
                                  setEditEqBatches(digitsOnly);
                                }}
                                inputMode="numeric"
                              />
                            ) : (
                              eq.expectedTotalBatches.toLocaleString('vi-VN')
                            )}
                          </TableCell>
                          <TableCell className="text-right">{formatMoney(perBatch)}</TableCell>
                          <TableCell className="text-center">
                            <div className="flex justify-center gap-2">
                              {inEdit ? (
                                <>
                                  <Button size="sm" onClick={() => saveEditEquipment(eq.id)}>Save</Button>
                                  <Button size="sm" variant="outline" onClick={cancelEditEquipment}>Cancel</Button>
                                </>
                              ) : (
                                <>
                                  <Button size="sm" variant="outline" onClick={() => startEditEquipment(eq)}>Edit</Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={async () => {
                                      await deleteEquipment(eq.id);
                                      setEquipment(await listEquipment());
                                    }}
                                  >
                                    Delete
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
              <div className="flex justify-end font-semibold">Equipment per batch: {formatMoney(equipmentPerBatch)}</div>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Monthly Overhead</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_120px] items-center gap-2">
                <Input placeholder="Name" value={ovName} onChange={(e) => setOvName(e.target.value)} />
                <Input
                  placeholder="Monthly amount"
                  value={ovMonthly ? Number(ovMonthly).toLocaleString('vi-VN') : ""}
                  onChange={(e) => {
                    const raw = e.target.value || "";
                    const digitsOnly = raw.replace(/\D/g, "");
                    setOvMonthly(digitsOnly);
                  }}
                  inputMode="numeric"
                />
                <Button onClick={handleAddOverhead}>Add</Button>
              </div>

              {overheads.length === 0 ? (
                <p className="text-sm text-gray-500">No overhead items yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead className="text-right">Monthly</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overheads.map((ov) => {
                      const inEdit = editingOvId === ov.id;
                      return (
                        <TableRow key={ov.id}>
                          <TableCell>
                            {inEdit ? (
                              <Input className="h-8" value={editOvName} onChange={(e) => setEditOvName(e.target.value)} />
                            ) : (
                              ov.name
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {inEdit ? (
                              <Input
                                className="h-8 text-right"
                                value={editOvMonthly ? Number(editOvMonthly).toLocaleString('vi-VN') : ""}
                                onChange={(e) => {
                                  const raw = e.target.value || "";
                                  const digitsOnly = raw.replace(/\D/g, "");
                                  setEditOvMonthly(digitsOnly);
                                }}
                                inputMode="numeric"
                              />
                            ) : (
                              formatMoney(ov.monthlyAmount)
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex justify-center gap-2">
                              {inEdit ? (
                                <>
                                  <Button size="sm" onClick={() => saveEditOverhead(ov.id)}>Save</Button>
                                  <Button size="sm" variant="outline" onClick={cancelEditOverhead}>Cancel</Button>
                                </>
                              ) : (
                                <>
                                  <Button size="sm" variant="outline" onClick={() => startEditOverhead(ov)}>Edit</Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={async () => {
                                      await deleteOverhead(ov.id);
                                      setOverheads(await listOverheads());
                                    }}
                                  >
                                    Delete
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
              <div className="flex justify-end font-semibold">Overhead per batch: {formatMoney(overheadPerBatch)}</div>
            </CardContent>
          </Card>
        </section>

        <section>
          <Card>
            <CardContent className="flex items-center justify-between py-4">
              <div className="font-semibold">Combined per-batch cost</div>
              <div className="text-xl font-bold">{formatMoney(combinedPerBatch)}</div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}


