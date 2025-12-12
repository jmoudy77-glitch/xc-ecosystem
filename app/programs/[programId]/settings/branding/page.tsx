import { supabaseServerComponent } from "@/lib/supabaseServerComponent";
import { revalidatePath } from "next/cache";

type PageProps = {
  params: Promise<{ programId: string }>;
};

function nullIfEmpty(value: FormDataEntryValue | null): string | null {
  const v = (value ?? "").toString().trim();
  return v === "" ? null : v;
}

async function saveBranding(formData: FormData) {
  "use server";

  const programId = (formData.get("program_id") as string | null) ?? null;
  if (!programId) {
    throw new Error("[BrandingSettings] Missing program_id");
  }

  const supabase = await supabaseServerComponent();

  const payload = {
    program_id: programId,
    primary_color: nullIfEmpty(formData.get("primary_color")),
    secondary_color: nullIfEmpty(formData.get("secondary_color")),
    accent_color: nullIfEmpty(formData.get("accent_color")),
    background_color: nullIfEmpty(formData.get("background_color")),
    surface_color: nullIfEmpty(formData.get("surface_color")),
    foreground_color: nullIfEmpty(formData.get("foreground_color")),
    muted_foreground_color: nullIfEmpty(
      formData.get("muted_foreground_color")
    ),
    link_color: nullIfEmpty(formData.get("link_color")),
    success_color: nullIfEmpty(formData.get("success_color")),
    warning_color: nullIfEmpty(formData.get("warning_color")),
    danger_color: nullIfEmpty(formData.get("danger_color")),
    logo_url: nullIfEmpty(formData.get("logo_url")),
    wordmark_url: nullIfEmpty(formData.get("wordmark_url")),
    theme_mode: nullIfEmpty(formData.get("theme_mode")),
    mascot_name: nullIfEmpty(formData.get("mascot_name")),
  };

  const { error } = await supabase
    .from("program_branding")
    .upsert(payload, { onConflict: "program_id" });

  if (error) {
    console.error("[BrandingSettings] upsert error:", error);
    throw new Error("Failed to save branding");
  }

  // Revalidate the program shell + settings page so new colors/logos apply immediately.
  revalidatePath(`/programs/${programId}`);
  revalidatePath(`/programs/${programId}/settings/branding`);
}

type BrandingFieldProps = {
  name: string;
  label: string;
  defaultValue?: string | null;
  placeholder?: string;
};

function BrandingField({
  name,
  label,
  defaultValue,
  placeholder,
}: BrandingFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={name}
        className="text-[11px] font-medium uppercase tracking-wide text-muted"
      >
        {label}
      </label>
      <input
        id={name}
        name={name}
        defaultValue={defaultValue ?? ""}
        className="h-9 w-full rounded-md border border-subtle bg-surface px-2 text-sm"
        placeholder={placeholder ?? "#123456 or CSS color"}
      />
    </div>
  );
}

export default async function BrandingSettingsPage({ params }: PageProps) {
  const { programId } = await params;

  const supabase = await supabaseServerComponent();

  const { data: branding, error } = await supabase
    .from("program_branding")
    .select("*")
    .eq("program_id", programId)
    .maybeSingle();

  if (error) {
    console.error("[BrandingSettings] load error:", error);
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="space-y-1">
        <h1 className="text-base font-semibold">Branding</h1>
        <p className="text-xs text-muted">
          Configure colors and basic identity for this program&apos;s dashboard
          shell. Leave any field blank to fall back to school or system
          defaults.
        </p>
      </div>

      <form
        action={saveBranding}
        className="space-y-6 rounded-xl border border-subtle bg-surface/60 p-4"
      >
        <input type="hidden" name="program_id" value={programId} />

        {/* Colors */}
        <div className="grid gap-4 md:grid-cols-2">
          <BrandingField
            name="primary_color"
            label="Primary color"
            defaultValue={branding?.primary_color}
          />
          <BrandingField
            name="secondary_color"
            label="Secondary color"
            defaultValue={branding?.secondary_color}
          />
          <BrandingField
            name="accent_color"
            label="Accent color"
            defaultValue={branding?.accent_color}
          />
          <BrandingField
            name="background_color"
            label="Background color"
            defaultValue={branding?.background_color}
          />
          <BrandingField
            name="surface_color"
            label="Surface color"
            defaultValue={branding?.surface_color}
          />
          <BrandingField
            name="foreground_color"
            label="Foreground color"
            defaultValue={branding?.foreground_color}
          />
          <BrandingField
            name="muted_foreground_color"
            label="Muted foreground color"
            defaultValue={branding?.muted_foreground_color}
          />
          <BrandingField
            name="link_color"
            label="Link color"
            defaultValue={branding?.link_color}
          />
          <BrandingField
            name="success_color"
            label="Success color"
            defaultValue={branding?.success_color}
          />
          <BrandingField
            name="warning_color"
            label="Warning color"
            defaultValue={branding?.warning_color}
          />
          <BrandingField
            name="danger_color"
            label="Danger color"
            defaultValue={branding?.danger_color}
          />
        </div>

        {/* Logo / Wordmark URLs */}
        <div className="grid gap-4 md:grid-cols-2">
          <BrandingField
            name="logo_url"
            label="Logo URL"
            defaultValue={branding?.logo_url}
            placeholder="https://example.com/logo.png"
          />
          <BrandingField
            name="wordmark_url"
            label="Wordmark URL"
            defaultValue={branding?.wordmark_url}
            placeholder="https://example.com/wordmark.png"
          />
        </div>

        {/* Theme mode + mascot */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label
              htmlFor="theme_mode"
              className="text-[11px] font-medium uppercase tracking-wide text-muted"
            >
              Theme mode
            </label>
            <select
              id="theme_mode"
              name="theme_mode"
              defaultValue={branding?.theme_mode ?? ""}
              className="h-9 w-full rounded-md border border-subtle bg-surface px-2 text-sm"
            >
              <option value="">Default (dark)</option>
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="mascot_name"
              className="text-[11px] font-medium uppercase tracking-wide text-muted"
            >
              Mascot name
            </label>
            <input
              id="mascot_name"
              name="mascot_name"
              defaultValue={branding?.mascot_name ?? ""}
              className="h-9 w-full rounded-md border border-subtle bg-surface px-2 text-sm"
              placeholder="Optional"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center rounded-md border border-subtle bg-brand px-4 py-2 text-xs font-semibold uppercase tracking-wide"
          >
            Save branding
          </button>
        </div>
      </form>
    </div>
  );
}