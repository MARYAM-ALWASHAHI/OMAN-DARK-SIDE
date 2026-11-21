#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Character.h"
#include "OTDCharacter.generated.h"

class UCameraComponent;
class USpringArmComponent;
class UStaticMeshComponent;
class UInputAction;
class UInputMappingContext;
struct FInputActionValue;

/**
 * Player character for the mobile vertical slice. THIRD-PERSON ONLY (project decision).
 *
 * Provides: walk / run, crouch, jump, touch look, and a collision-aware follow camera.
 * Input: touch (virtual joysticks + on-screen buttons) is the target. Keyboard/mouse/gamepad
 * mappings exist only so the game can be tested inside the Unreal editor.
 * If no Input Action assets are assigned in a Blueprint subclass, defaults are built at runtime.
 * Body: a placeholder cylinder until the real Rashid character mesh exists.
 */
UCLASS()
class OMANDARKSIDE_API AOTDCharacter : public ACharacter
{
	GENERATED_BODY()

public:
	AOTDCharacter();

	/** Crouch / stand up. Crouching also stops running. */
	UFUNCTION(BlueprintCallable, Category = "OTD|Movement")
	void ToggleCrouch();

	UFUNCTION(BlueprintPure, Category = "OTD|Movement")
	bool IsSprinting() const { return bIsSprinting; }

	UFUNCTION(BlueprintCallable, Category = "OTD|Movement")
	void SetSprinting(bool bNewSprinting);

	/** Used by the touch RUN button (holding a button while steering is awkward on a phone). */
	UFUNCTION(BlueprintCallable, Category = "OTD|Movement")
	void ToggleSprint() { SetSprinting(!bIsSprinting); }

protected:
	virtual void BeginPlay() override;
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;
	virtual void PawnClientRestart() override;
	virtual void SetupPlayerInputComponent(UInputComponent* PlayerInputComponent) override;

	// --- Components ---
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "OTD|Camera")
	TObjectPtr<USpringArmComponent> CameraBoom;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "OTD|Camera")
	TObjectPtr<UCameraComponent> ThirdPersonCamera;

	/** Temporary visible body. Replace with a skeletal mesh in a later milestone. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "OTD|Placeholder")
	TObjectPtr<UStaticMeshComponent> PlaceholderBody;

	// --- Tuning (data, not code: override in a Blueprint subclass) ---
	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "OTD|Movement", meta = (ClampMin = "50"))
	float WalkSpeed = 300.f;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "OTD|Movement", meta = (ClampMin = "50"))
	float SprintSpeed = 600.f;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "OTD|Movement", meta = (ClampMin = "50"))
	float CrouchSpeed = 150.f;

	/** Camera distance behind the character (the spring arm also pulls in when blocked by walls). */
	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "OTD|Camera", meta = (ClampMin = "120", ClampMax = "600"))
	float ThirdPersonArmLength = 300.f;

	/** Print camera/sprint state changes on screen (useful for M1 testing). */
	UPROPERTY(EditDefaultsOnly, Category = "OTD|Debug")
	bool bShowDebugMessages = true;

	// --- Mobile (phone / iPad) ---
	/** Show on-screen RUN / CROUCH / JUMP buttons on touch devices. */
	UPROPERTY(EditDefaultsOnly, Category = "OTD|Mobile")
	bool bEnableTouchControls = true;

	/** Also show the touch buttons on PC (to test in PIE with "Use Mouse for Touch"). */
	UPROPERTY(EditDefaultsOnly, Category = "OTD|Mobile")
	bool bForceTouchControls = false;

	// --- Input (optional assets; runtime defaults are built if any are left empty) ---
	UPROPERTY(EditDefaultsOnly, Category = "OTD|Input")
	TObjectPtr<UInputMappingContext> DefaultMappingContext;

	UPROPERTY(EditDefaultsOnly, Category = "OTD|Input")
	TObjectPtr<UInputAction> MoveAction;

	UPROPERTY(EditDefaultsOnly, Category = "OTD|Input")
	TObjectPtr<UInputAction> LookAction;

	UPROPERTY(EditDefaultsOnly, Category = "OTD|Input")
	TObjectPtr<UInputAction> JumpAction;

	UPROPERTY(EditDefaultsOnly, Category = "OTD|Input")
	TObjectPtr<UInputAction> SprintAction;

	UPROPERTY(EditDefaultsOnly, Category = "OTD|Input")
	TObjectPtr<UInputAction> CrouchAction;

private:
	void BuildDefaultInputIfMissing();
	void AddMappingContextToLocalPlayer();

	void HandleMove(const FInputActionValue& Value);
	void HandleLook(const FInputActionValue& Value);
	void HandleSprintStarted() { SetSprinting(true); }
	void HandleSprintStopped() { SetSprinting(false); }

	void ShowTouchControlsIfNeeded();
	void HideTouchControls();

	TSharedPtr<class SWidget> TouchControlsWidget;

	void DebugMessage(const FString& Message) const;

	bool bIsSprinting = false;
};
