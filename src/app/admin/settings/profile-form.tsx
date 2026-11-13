"use client";

import * as React from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { profileSchema, type ProfileInput } from "@/lib/validation/profile";
import { updateProfile } from "@/server/actions/profile";

function zoneLabel(zone: string) {
  return zone.replaceAll("_", " ").replaceAll("/", " / ");
}

export function ProfileForm({
  defaults,
  timeZones,
  email,
}: {
  defaults: ProfileInput;
  timeZones: string[];
  email: string;
}) {
  const { toast } = useToast();
  const [pending, startTransition] = React.useTransition();
  const {
    register,
    control,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: defaults,
    mode: "onBlur",
  });

  const onSubmit = handleSubmit((values) =>
    startTransition(async () => {
      const result = await updateProfile(values);
      if (result.ok) {
        reset(values);
        toast({ title: result.message });
        return;
      }
      for (const [key, message] of Object.entries(result.fieldErrors ?? {})) {
        setError(key as keyof ProfileInput, { message });
      }
      toast({ title: result.message, variant: "danger" });
    }),
  );

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Display name" required error={errors.display_name?.message}>
          {(control) => (
            <Input
              {...control}
              autoComplete="name"
              maxLength={60}
              defaultValue={defaults.display_name}
              {...register("display_name")}
            />
          )}
        </Field>
        <Field label="Nickname" required hint="Shown to your partner." error={errors.nickname?.message}>
          {(control) => (
            <Input
              {...control}
              autoComplete="nickname"
              maxLength={40}
              defaultValue={defaults.nickname}
              {...register("nickname")}
            />
          )}
        </Field>
      </div>

      <Field
        label="Time zone"
        hint="Used for your greeting and dates you see."
        error={errors.timezone?.message}
      >
        {(fieldProps) => (
          <Controller
            control={control}
            name="timezone"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger
                  id={fieldProps.id}
                  aria-describedby={fieldProps["aria-describedby"]}
                  aria-invalid={fieldProps["aria-invalid"]}
                  onBlur={field.onBlur}
                  ref={field.ref}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-[320px]">
                  {timeZones.map((zone) => (
                    <SelectItem key={zone} value={zone}>
                      {zoneLabel(zone)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        )}
      </Field>

      <Field label="Email" hint="Sign-in email. It can’t be changed here.">
        {(control) => <Input {...control} value={email} readOnly className="text-muted" />}
      </Field>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending || !isDirty}>
          {pending ? "Saving…" : "Save profile"}
        </Button>
      </div>
    </form>
  );
}
